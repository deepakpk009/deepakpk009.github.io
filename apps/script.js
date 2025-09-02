// DOM Content Loaded Event Listener
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
});

/**
 * Load projects from JSON file and render them
 */
async function loadProjects() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const gridElement = document.getElementById('projects-grid');
    
    try {
        // Fetch projects data from JSON file
        const response = await fetch('projects.json');
        
        // Check if request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON data
        const data = await response.json();
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
        
        // Render projects
        renderProjects(data.projects, gridElement);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        
        // Hide loading and show error message
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
    }
}

/**
 * Render projects in the grid
 * @param {Array} projects - Array of project objects
 * @param {HTMLElement} container - Container element to render projects
 */
function renderProjects(projects, container) {
    // Clear existing content
    container.innerHTML = '';
    
    // Check if projects exist and is an array
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
        container.innerHTML = '<p class="no-projects">No projects found.</p>';
        return;
    }
    
    // Create project cards
    projects.forEach((project, index) => {
        const projectCard = createProjectCard(project, index);
        container.appendChild(projectCard);
    });
}

/**
 * Create a single project card element
 * @param {Object} project - Project object with title, description, thumbnail, url
 * @param {number} index - Index of the project (for accessibility)
 * @returns {HTMLElement} - Project card element
 */
function createProjectCard(project, index) {
    // Create main card container
    const card = document.createElement('div');
    card.className = 'project-card';
    card.role = 'button';
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open project: ${project.title}`);
    
    // Create thumbnail image
    const thumbnail = document.createElement('img');
    thumbnail.className = 'project-thumbnail';
    thumbnail.src = project.thumbnail || 'https://via.placeholder.com/400x200?text=No+Image';
    thumbnail.alt = `${project.title} thumbnail`;
    thumbnail.loading = 'lazy'; // Lazy loading for better performance
    
    // Handle image loading errors
    thumbnail.onerror = function() {
        this.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
    };
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'project-content';
    
    // Create title
    const title = document.createElement('h3');
    title.className = 'project-title';
    title.textContent = project.title || 'Untitled Project';
    
    // Create description
    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = project.description || 'No description available.';
    
    // Append content elements
    content.appendChild(title);
    content.appendChild(description);
    
    // Append all elements to card
    card.appendChild(thumbnail);
    card.appendChild(content);
    
    // Add click event listener
    card.addEventListener('click', () => openProject(project.url));
    
    // Add keyboard event listener for accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProject(project.url);
        }
    });
    
    return card;
}

/**
 * Open project URL in new tab
 * @param {string} url - Project URL
 */
function openProject(url) {
    if (!url) {
        console.warn('No URL provided for project');
        return;
    }
    
    // Ensure URL has protocol
    const projectUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Open in new tab
    window.open(projectUrl, '_blank', 'noopener,noreferrer');
}
