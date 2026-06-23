/**
 * BigQuery Release Notes Explorer - Client Script
 */

let allNotes = [];
let activeTypeFilter = 'all';
let searchQuery = '';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCsv = document.getElementById('btn-export-csv');
const searchInput = document.getElementById('search-input');
const typeFilters = document.getElementById('type-filters');
const feedContainer = document.getElementById('feed-container');
const loadingContainer = document.getElementById('loading-container');
const errorContainer = document.getElementById('error-container');
const errorMsg = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');

// Composer / Modal Elements
const composerOverlay = document.getElementById('composer-overlay');
const btnCloseComposer = document.getElementById('btn-close-composer');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const metaType = document.getElementById('meta-type');
const metaDate = document.getElementById('meta-date');
const metaLink = document.getElementById('meta-link');
const btnTweet = document.getElementById('btn-tweet');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    btnExportCsv.addEventListener('click', exportToCSV);
    
    // Live Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRenderFeed();
    });
    
    // Filter Pills
    typeFilters.addEventListener('click', (e) => {
        const filterButton = e.target.closest('.filter-pill');
        if (!filterButton) return;
        
        // Update Active Pill state
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        filterButton.classList.add('active');
        
        activeTypeFilter = filterButton.dataset.type;
        filterAndRenderFeed();
    });
    
    // Composer Modal Events
    btnCloseComposer.addEventListener('click', closeComposer);
    composerOverlay.addEventListener('click', (e) => {
        if (e.target === composerOverlay) closeComposer();
    });
    
    // Live Character Counter in composer
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Send Tweet Action
    btnTweet.addEventListener('click', sendTweet);
}

// Fetch data from API
async function fetchReleaseNotes() {
    showLoading();
    
    // Spin refresh icon
    const refreshIcon = btnRefresh.querySelector('.icon-spin-target');
    if (refreshIcon) refreshIcon.classList.add('icon-spin');
    btnRefresh.disabled = true;
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`Server returned error status ${response.status}`);
        }
        
        const data = await response.json();
        allNotes = data.entries || [];
        
        // Show success state
        errorContainer.classList.add('hidden');
        loadingContainer.classList.add('hidden');
        feedContainer.classList.remove('hidden');
        
        // Initial filter & render
        filterAndRenderFeed();
        updateStats();
    } catch (err) {
        showError(err.message);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('icon-spin');
        btnRefresh.disabled = false;
        // Re-initialize icons just in case
        if (window.lucide) window.lucide.createIcons();
    }
}

// Show skeleton loaders
function showLoading() {
    loadingContainer.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
}

// Show error card
function showError(message) {
    loadingContainer.classList.add('hidden');
    feedContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMsg.textContent = message || "Something went wrong while connecting to the BigQuery Release Notes RSS server.";
}

// Update dashboard statistics
function updateStats() {
    statTotal.textContent = allNotes.length;
    
    const featuresCount = allNotes.filter(n => n.type.toLowerCase() === 'feature').length;
    const issuesCount = allNotes.filter(n => n.type.toLowerCase() === 'issue').length;
    
    statFeatures.textContent = featuresCount;
    statIssues.textContent = issuesCount;
}

// Main Filter & Render Logic
function filterAndRenderFeed() {
    // 1. Filter
    const filteredNotes = allNotes.filter(note => {
        const matchesType = activeTypeFilter === 'all' || note.type.toLowerCase() === activeTypeFilter;
        
        const textToSearch = `${note.type} ${note.date} ${note.text}`.toLowerCase();
        const matchesSearch = textToSearch.includes(searchQuery);
        
        return matchesType && matchesSearch;
    });
    
    // 2. Render
    if (filteredNotes.length === 0) {
        renderEmptyState();
        return;
    }
    
    // Group notes by Date (since multiple notes can happen on the same day)
    const groupedNotes = {};
    filteredNotes.forEach(note => {
        if (!groupedNotes[note.date]) {
            groupedNotes[note.date] = [];
        }
        groupedNotes[note.date].push(note);
    });
    
    feedContainer.innerHTML = '';
    
    // Build Timeline
    Object.keys(groupedNotes).forEach(date => {
        const timelineSection = document.createElement('div');
        timelineSection.className = 'timeline-section';
        
        timelineSection.innerHTML = `
            <div class="timeline-date-marker"></div>
            <h2 class="timeline-date-header">${date}</h2>
            <div class="timeline-cards-wrapper"></div>
        `;
        
        const cardsWrapper = timelineSection.querySelector('.timeline-cards-wrapper');
        
        groupedNotes[date].forEach(note => {
            const card = document.createElement('div');
            // Add type class for hovering glowing accents
            const typeClass = `type-${note.type.toLowerCase()}`;
            card.className = `release-card ${typeClass}`;
            card.dataset.id = note.id;
            
            const badgeClass = `badge-${note.type.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="release-card-header">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <div class="card-actions">
                        <button class="btn-copy-clipboard" aria-label="Copy update to clipboard">
                            <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                            <span>Copy</span>
                        </button>
                        <button class="btn-select-tweet" aria-label="Tweet this update">
                            <i data-lucide="twitter" style="width: 14px; height: 14px;"></i>
                            <span>Tweet</span>
                        </button>
                    </div>
                </div>
                <div class="release-card-body">
                    ${note.html}
                </div>
            `;
            
            // Register select-to-tweet event
            const btnTweetSelect = card.querySelector('.btn-select-tweet');
            btnTweetSelect.addEventListener('click', () => openComposer(note));
            
            // Register copy-to-clipboard event
            const btnCopy = card.querySelector('.btn-copy-clipboard');
            btnCopy.addEventListener('click', () => copyToClipboard(note, btnCopy));
            
            cardsWrapper.appendChild(card);
        });
        
        feedContainer.appendChild(timelineSection);
    });
    
    // Update Icons
    if (window.lucide) window.lucide.createIcons();
}

// Render empty state
function renderEmptyState() {
    feedContainer.innerHTML = `
        <div class="no-results animate-slide-up">
            <i data-lucide="search-code" class="no-results-icon"></i>
            <h3>No release notes match your criteria</h3>
            <p>Try clearing your search query or choosing another type filter.</p>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

// Open Tweet Composer Modal
function openComposer(note) {
    // 1. Open Modal
    composerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
    
    // 2. Format prefilled tweet intelligently
    // X/Twitter links count as 23 characters. Prefix is [BigQuery {Type}] {Date}:
    const urlLength = 23;
    const typeLabel = note.type.charAt(0).toUpperCase() + note.type.slice(1);
    const prefix = `[BigQuery ${typeLabel}] ${note.date}: `;
    const linkSuffix = `\n${note.link}`;
    
    // Deduct characters from 280 to find available space for the description
    // Prefix length + Link Suffix length (including 1 space + 23 characters for the URL)
    // 280 - prefix.length - 24 (space + url) - 4 (space + ellipsis)
    const allowance = 280 - prefix.length - 24 - 4;
    
    let descriptionText = note.text;
    if (prefix.length + descriptionText.length + 24 > 280) {
        descriptionText = descriptionText.substring(0, allowance) + "...";
    }
    
    const prefilledText = `${prefix}${descriptionText}${linkSuffix}`;
    
    // 3. Set content
    tweetTextarea.value = prefilledText;
    
    // Set reference metadata
    metaDate.textContent = note.date;
    metaType.textContent = note.type;
    metaType.className = `badge badge-${note.type.toLowerCase()}`;
    metaLink.href = note.link;
    
    // Trigger initial character count check
    updateCharCount();
}

// Close Composer Modal
function closeComposer() {
    composerOverlay.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock scrolling
}

// Live character counter logic
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // Regex to match URLs. X/Twitter replaces ALL URLs (http/https) with a t.co link (23 characters).
    // Let's perform this calculation to get the true X/Twitter character count.
    const urlPattern = /https?:\/\/[^\s]+/g;
    let urls = text.match(urlPattern) || [];
    
    // Length without URLs
    let lengthWithoutUrls = text.replace(urlPattern, '').length;
    
    // Total simulated length
    const totalSimulatedLength = lengthWithoutUrls + (urls.length * 23);
    
    charCounter.textContent = `${totalSimulatedLength} / 280`;
    
    // Formatting classes
    charCounter.className = 'character-counter';
    if (totalSimulatedLength > 280) {
        charCounter.classList.add('danger');
        btnTweet.disabled = true;
    } else if (totalSimulatedLength > 260) {
        charCounter.classList.add('warning');
        btnTweet.disabled = false;
    } else {
        btnTweet.disabled = false;
    }
}

// Open X/Twitter Intent
function sendTweet() {
    const tweetText = tweetTextarea.value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    // Open X in new window
    window.open(tweetUrl, '_blank', 'width=550,height=420,referrerpolicy=no-referrer');
}

// Copy update details to clipboard
function copyToClipboard(note, buttonElement) {
    const copyText = `[BigQuery ${note.type}] ${note.date}: ${note.text}\nSource: ${note.link}`;
    navigator.clipboard.writeText(copyText).then(() => {
        // Visual feedback animation
        const span = buttonElement.querySelector('span');
        const icon = buttonElement.querySelector('i');
        
        buttonElement.classList.add('copied');
        if (span) span.textContent = 'Copied!';
        if (icon) {
            icon.setAttribute('data-lucide', 'check');
            if (window.lucide) window.lucide.createIcons();
        }
        
        setTimeout(() => {
            buttonElement.classList.remove('copied');
            if (span) span.textContent = 'Copy';
            if (icon) {
                icon.setAttribute('data-lucide', 'copy');
                if (window.lucide) window.lucide.createIcons();
            }
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Export the currently filtered notes to a CSV file
function exportToCSV() {
    const filteredNotes = allNotes.filter(note => {
        const matchesType = activeTypeFilter === 'all' || note.type.toLowerCase() === activeTypeFilter;
        const textToSearch = `${note.type} ${note.date} ${note.text}`.toLowerCase();
        const matchesSearch = textToSearch.includes(searchQuery);
        return matchesType && matchesSearch;
    });
    
    if (filteredNotes.length === 0) {
        alert("No release notes found to export.");
        return;
    }
    
    // CSV Headers
    const headers = ['ID', 'Date', 'Type', 'URL', 'Description'];
    
    // Helper to escape CSV formatting constraints
    const escapeCSVValue = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            str = `"${str}"`;
        }
        return str;
    };
    
    // Build CSV
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    filteredNotes.forEach(note => {
        const row = [
            escapeCSVValue(note.id),
            escapeCSVValue(note.date),
            escapeCSVValue(note.type),
            escapeCSVValue(note.link),
            escapeCSVValue(note.text)
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const filterSuffix = activeTypeFilter !== 'all' ? `_${activeTypeFilter}` : '';
    link.setAttribute('download', `bigquery_release_notes${filterSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
