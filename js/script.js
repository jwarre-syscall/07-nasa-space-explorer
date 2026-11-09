const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImages');
const gallery = document.getElementById('gallery');
const statusMessage = document.getElementById('status');
const resultCount = document.getElementById('resultCount');
const photoModal = document.getElementById('photoModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const modalLink = document.getElementById('modalLink');

const spaceFacts = [
  'A day on Venus is longer than its year: it takes about 243 Earth days to rotate once, but only 225 to orbit the Sun.',
  'Neutron stars are so dense that a teaspoon of their material would weigh billions of tons on Earth.',
  'The footprints left by Apollo astronauts can last for millions of years because the Moon has no wind or rain to erase them.',
  'Saturn’s rings are made mostly of countless pieces of water ice, ranging from tiny grains to boulders.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  'There are more stars in the observable universe than grains of sand on all of Earth’s beaches.',
  'Jupiter’s Great Red Spot is a giant storm that has been observed for hundreds of years.',
  'The International Space Station circles Earth about once every 90 minutes.'
];

document.getElementById('spaceFact').textContent =
  spaceFacts[Math.floor(Math.random() * spaceFacts.length)];

setupDateInputs(startInput, endInput);

let activeRequest;
getImagesButton.addEventListener('click', loadSpaceImages);
document.getElementById('closeModal').addEventListener('click', () => photoModal.close());
photoModal.addEventListener('click', (event) => {
  if (event.target === photoModal) photoModal.close();
});

function formatDate(dateString) {
  return new Date(dateString + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function setStatus(message, type = '') {
  statusMessage.className = 'status' + (type ? ' ' + type : '');
  statusMessage.textContent = message;
}

function createVideoPlaceholder() {
  const placeholder = document.createElement('span');
  placeholder.className = 'video-image card-image';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = '▶';
  return placeholder;
}

function createCard(item) {
  const isVideo = item.media_type === 'video';
  const card = document.createElement('button');
  card.className = 'gallery-card';
  card.type = 'button';
  card.setAttribute('aria-label', (isVideo ? 'Open video: ' : 'View image: ') + item.title);

  const imageWrap = document.createElement('span');
  imageWrap.className = 'card-image-wrap';
  if (isVideo) {
    imageWrap.append(createVideoPlaceholder());
    const badge = document.createElement('span');
    badge.className = 'video-badge';
    badge.textContent = 'VIDEO';
    imageWrap.append(badge);
  } else {
    const image = document.createElement('img');
    image.className = 'card-image';
    image.src = item.hdurl || item.url;
    image.alt = item.title;
    image.loading = 'lazy';
    image.onerror = () => { image.replaceWith(createVideoPlaceholder()); };
    imageWrap.append(image);
  }

  const copy = document.createElement('span');
  copy.className = 'card-copy';
  const date = document.createElement('span');
  date.className = 'card-date';
  date.textContent = formatDate(item.date);
  const title = document.createElement('span');
  title.className = 'card-title';
  title.textContent = item.title;
  copy.append(date, title);

  if (isVideo) {
    const hint = document.createElement('span');
    hint.className = 'video-hint';
    hint.textContent = 'Open video details ↗';
    copy.append(hint);
  }

  card.append(imageWrap, copy);
  card.addEventListener('click', () => showDetails(item));
  return card;
}

function youtubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    let videoId = '';
    if (parsed.hostname.includes('youtu.be')) videoId = parsed.pathname.slice(1);
    if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
    }
    return videoId ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) : '';
  } catch {
    return '';
  }
}

function showDetails(item) {
  modalMedia.replaceChildren();
  modalTitle.textContent = item.title;
  modalDate.textContent = formatDate(item.date);
  modalExplanation.textContent = item.explanation || 'NASA has not provided an explanation for this entry.';
  modalLink.href = item.permalink || item.url;
  modalLink.hidden = !item.url;
  modalLink.textContent = item.media_type === 'video' ? 'Open video on NASA ↗' : 'View on NASA ↗';

  if (item.media_type === 'video') {
    const embedUrl = youtubeEmbedUrl(item.video_url || item.url);
    if (embedUrl) {
      const frame = document.createElement('iframe');
      frame.src = embedUrl;
      frame.title = item.title;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      modalMedia.append(frame);
    } else {
      const placeholder = createVideoPlaceholder();
      placeholder.style.width = '100%';
      placeholder.style.minHeight = '260px';
      modalMedia.append(placeholder);
    }
  } else {
    const image = document.createElement('img');
    image.src = item.hdurl || item.url;
    image.alt = item.title;
    modalMedia.append(image);
  }
  photoModal.showModal();
}

async function loadSpaceImages() {
  const startDate = startInput.value;
  const endDate = endInput.value;
  if (!startDate || !endDate) {
    setStatus('Choose both a start date and an end date.', 'error');
    return;
  }
  if (startDate > endDate) {
    setStatus('The start date must be before the end date.', 'error');
    return;
  }
  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
  if (days > 9) {
    setStatus('Choose a date range of 9 days or fewer.', 'error');
    return;
  }

  if (activeRequest) activeRequest.abort();
  activeRequest = new AbortController();
  getImagesButton.disabled = true;
  gallery.replaceChildren();
  resultCount.textContent = '';
  setStatus('Loading space photos…', 'loading');

  const nasaDate = (value) => value.replaceAll('-', '').slice(2);\n  const params = new URLSearchParams({ date_from: nasaDate(startDate), date_to: nasaDate(endDate) });
  try {
    const response = await fetch('https://science.nasa.gov/wp-json/wp/v2/apod-basic/?' + params.toString(), {
      signal: activeRequest.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.msg || data.error?.message || 'NASA’s APOD service returned an error.');
    const entries = Array.isArray(data) ? data : [data];
    const supported = entries.filter((item) => item.media_type === 'image' || item.media_type === 'video');
    if (!supported.length) {
      setStatus('No space photos or videos were found for those dates.');
      return;
    }
    supported.sort((a, b) => b.date.localeCompare(a.date));
    const cards = supported.map(createCard);
    gallery.replaceChildren(...cards);
    resultCount.textContent = supported.length + (supported.length === 1 ? ' result' : ' results');
    setStatus('Showing ' + supported.length + (supported.length === 1 ? ' APOD entry.' : ' APOD entries.'));
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Unable to load NASA APOD entries:', error);
    setStatus(error.message || 'Unable to load space photos. Please try again.', 'error');
  } finally {
    getImagesButton.disabled = false;
  }
}