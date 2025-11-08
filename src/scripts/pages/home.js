import StoryAPI from '../data/story-api';
import Footer from '../components/footer';

class HomePage {
  #map = null;
  #markers = new L.LayerGroup();
  #stories = [];
  #activeMarkerId = null;
  
  async render() {
    if (!localStorage.getItem('token')) {
      window.location.hash = '#/login';
      return;
    }

    return `
      <div class="container">
        <h1 class="page-title">Story List</h1>
        
        <div class="story-header">
          <div class="story-filters">
            <select id="location-filter" aria-label="Filter stories by location">
              <option value="">All Locations</option>
            </select>
          </div>
          <div class="header-actions">
            <a href="#/add" class="add-button" role="button">+ Add Story</a>
            <button class="logout-button" id="logoutButton">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
        
        <div class="content-wrapper">
          <div id="map" role="application" aria-label="Story locations map"></div>
          <div class="story-list" id="story-list" role="feed"></div>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    if (!localStorage.getItem('token')) {
      return;
    }

    // Initialize map
    this.#initializeMap();
    this.#markers.addTo(this.#map);

    // Setup logout button
    document.getElementById('logoutButton').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.hash = '#/login';
    });

    // Force map to update its size
    setTimeout(() => {
      this.#map.invalidateSize();
    }, 100);

    try {
      await this.#loadStories();
      this.#renderStories();
      this.#setupFilters();
    } catch (error) {
      if (error.message === 'Unauthorized') {
        localStorage.removeItem('token');
        window.location.hash = '#/login';
      }
    }
  }

  #initializeMap() {
    this.#map = L.map('map').setView([-2.548926, 118.014863], 5)
    
    // Base layers
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri'
    });

    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap'
    });

    const baseMaps = {
      "Streets": streets,
      "Satellite": satellite, 
      "Topography": topo
    };

    streets.addTo(this.#map);
    L.control.layers(baseMaps).addTo(this.#map);
  }

  #highlightMarker(markerId) {
    this.#markers.eachLayer((layer) => {
      if (layer.options.id === markerId) {
        layer.setIcon(this.#getHighlightedIcon());
        layer.openPopup();
        this.#map.flyTo(layer.getLatLng(), 13);
      } else {
        layer.setIcon(this.#getDefaultIcon());
      }
    });
    this.#activeMarkerId = markerId;
  }

  #getDefaultIcon() {
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  }

  #getHighlightedIcon() {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  }

  async #loadStories() {
    const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to load stories');
    }

    const { listStory } = await response.json();
    this.#stories = listStory;
  }

  #renderStories() {
    const storyList = document.getElementById('story-list');
    this.#markers.clearLayers();
    storyList.innerHTML = '';

    this.#stories.forEach(story => {
      if (story.lat && story.lon) {
        // Format date
        const createdAt = new Date(story.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        // Add marker
        const marker = L.marker([story.lat, story.lon], {
          id: story.id,
          icon: this.#getDefaultIcon()
        })
        .bindPopup(`
          <article>
            <h2>${story.name}</h2>
            <img src="${story.photoUrl}" alt="Photo by ${story.name}">
            <p>${story.description}</p>
            <p class="story-date"><i class="far fa-calendar-alt"></i> ${createdAt}</p>
          </article>
        `);
        
        marker.addTo(this.#markers);

        // Add list item
        const storyElement = document.createElement('article');
        storyElement.className = 'story-item';
        storyElement.dataset.id = story.id;
        storyElement.innerHTML = `
          <img src="${story.photoUrl}" alt="Photo by ${story.name}">
          <div class="story-item-content">
            <h2>${story.name}</h2>
            <p>${story.description}</p>
            <div class="story-meta">
              <span class="story-date">
                <i class="far fa-calendar-alt"></i> ${createdAt}
              </span>
              <span class="story-location">
                <i class="fas fa-map-marker-alt"></i> 
                ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}
              </span>
            </div>
          </div>
        `;

        storyElement.addEventListener('click', () => {
          this.#highlightMarker(story.id);
        });

        storyList.appendChild(storyElement);
      }
    });
  }

  #setupFilters() {
    const filter = document.getElementById('location-filter');
    const locations = [...new Set(this.#stories
      .filter(s => s.lat && s.lon)
      .map(s => `${s.lat},${s.lon}`))];
    
    locations.forEach(location => {
      const [lat, lon] = location.split(',');
      const option = document.createElement('option');
      option.value = location;
      option.textContent = `Location (${lat.slice(0,6)}, ${lon.slice(0,6)})`;
      filter.appendChild(option);
    });

    filter.addEventListener('change', (e) => {
      if (e.target.value) {
        const [lat, lon] = e.target.value.split(',');
        this.#map.flyTo([lat, lon], 13);
      } else {
        this.#map.setView([-2.548926, 118.014863], 5);
      }
    });
  }
}

export default HomePage;