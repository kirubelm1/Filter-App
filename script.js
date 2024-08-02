
//even listners
document.getElementById('upload').addEventListener('change', handleUpload);
document.getElementById('grayscale').addEventListener('click', () => applyFilter ('grayscale(100%)'));
document.getElementById('sepia').addEventListener('click', () => applyFilter ('sepia(100%)'));
document.getElementById('blur').addEventListener('click', () => applyFilter ('blur(5px)'));
document.getElementById('brightness').addEventListener('click', () => applyFilter ('brightness(150%)'));
document.getElementById('contrast').addEventListener('click', () => applyFilter ('contrast(200%)'));
document.getElementById('reset').addEventListener('click', resetFilters);
document.getElementById('download').addEventListener('click', downloadImage);

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let img = new Image();

function handleUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }
    reader.readAsDataURL(file);
}

function applyFilter(filter) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function resetFilters() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'filtered-image.png';
    link.href = canvas.toDataURL();
    link.click();
}
