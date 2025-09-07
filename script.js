class PhotoEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.currentImage = null;
        this.history = [];
        this.historyStep = -1;
        this.zoom = 1;
        this.currentTool = 'select';
        
        // Adjustment values
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            vignette: 0
        };
        
        this.layers = [
            { id: 0, name: 'Background', opacity: 100, visible: true, data: null }
        ];
        this.activeLayer = 0;
        
        this.initializeEventListeners();
        this.initializeUI();
    }
    
    initializeEventListeners() {
        // File operations
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('upload').click();
        });
        document.getElementById('upload').addEventListener('change', this.handleUpload.bind(this));
        document.getElementById('save-btn').addEventListener('click', this.downloadImage.bind(this));
        
        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redo-btn').addEventListener('click', this.redo.bind(this));
        
        // Tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });
        
        // Transform operations
        document.getElementById('rotate-left').addEventListener('click', () => this.rotate(-90));
        document.getElementById('rotate-right').addEventListener('click', () => this.rotate(90));
        document.getElementById('flip-horizontal').addEventListener('click', () => this.flip('horizontal'));
        document.getElementById('flip-vertical').addEventListener('click', () => this.flip('vertical'));
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.setZoom(this.zoom * 1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.setZoom(this.zoom / 1.2));
        document.getElementById('zoom-fit').addEventListener('click', this.fitToScreen.bind(this));
        
        // Panel tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchPanel(e.target.dataset.tab);
            });
        });
        
        // Adjustment sliders
        Object.keys(this.adjustments).forEach(adjustment => {
            const slider = document.getElementById(adjustment);
            const valueDisplay = document.getElementById(`${adjustment}-value`);
            
            slider.addEventListener('input', (e) => {
                this.adjustments[adjustment] = parseInt(e.target.value);
                valueDisplay.textContent = e.target.value;
                this.applyAdjustments();
            });
        });
        
        // Reset adjustments
        document.getElementById('reset-adjustments').addEventListener('click', this.resetAdjustments.bind(this));
        
        // Filter presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyFilterPreset(e.target.dataset.filter);
                this.setActivePreset(e.target);
            });
        });
        
        // Layer controls
        document.getElementById('add-layer').addEventListener('click', this.addLayer.bind(this));
        document.getElementById('duplicate-layer').addEventListener('click', this.duplicateLayer.bind(this));
        document.getElementById('delete-layer').addEventListener('click', this.deleteLayer.bind(this));
    }
    
    initializeUI() {
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.updateZoomInfo();
    }
    
    handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                this.saveState();
                this.fitToScreen();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    }
    
    rotate(degrees) {
        if (!this.originalImage) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (Math.abs(degrees) === 90) {
            tempCanvas.width = this.canvas.height;
            tempCanvas.height = this.canvas.width;
        } else {
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
        }
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate((degrees * Math.PI) / 180);
        tempCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
        
        this.canvas.width = tempCanvas.width;
        this.canvas.height = tempCanvas.height;
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        this.saveState();
    }
    
    flip(direction) {
        if (!this.originalImage) return;
        
        this.ctx.save();
        
        if (direction === 'horizontal') {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.canvas, -this.canvas.width, 0);
        } else {
            this.ctx.scale(1, -1);
            this.ctx.drawImage(this.canvas, 0, -this.canvas.height);
        }
        
        this.ctx.restore();
        this.saveState();
    }
    
    setZoom(newZoom) {
        this.zoom = Math.max(0.1, Math.min(5, newZoom));
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.updateZoomInfo();
    }
    
    fitToScreen() {
        if (!this.canvas.width || !this.canvas.height) return;
        
        const container = document.querySelector('.canvas-wrapper');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        
        this.setZoom(Math.min(scaleX, scaleY));
    }
    
    updateZoomInfo() {
        document.getElementById('zoom-info').textContent = `${Math.round(this.zoom * 100)}%`;
    }
    
    switchPanel(panelName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-tab="${panelName}"]`).classList.add('active');
        document.getElementById(`${panelName}-panel`).classList.add('active');
    }
    
    applyAdjustments() {
        if (!this.originalImage) return;
        
        // Clear canvas and redraw original image
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Build filter string
        let filters = [];
        
        if (this.adjustments.brightness !== 0) {
            filters.push(`brightness(${100 + this.adjustments.brightness}%)`);
        }
        
        if (this.adjustments.contrast !== 0) {
            filters.push(`contrast(${100 + this.adjustments.contrast}%)`);
        }
        
        if (this.adjustments.saturation !== 0) {
            filters.push(`saturate(${100 + this.adjustments.saturation}%)`);
        }
        
        if (this.adjustments.hue !== 0) {
            filters.push(`hue-rotate(${this.adjustments.hue}deg)`);
        }
        
        if (this.adjustments.blur > 0) {
            filters.push(`blur(${this.adjustments.blur}px)`);
        }
        
        // Apply filters
        this.ctx.filter = filters.join(' ') || 'none';
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Apply vignette effect manually
        if (this.adjustments.vignette > 0) {
            this.applyVignette(this.adjustments.vignette);
        }
        
        this.ctx.filter = 'none';
    }
    
    applyVignette(intensity) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity / 100})`);
        
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    resetAdjustments() {
        Object.keys(this.adjustments).forEach(key => {
            this.adjustments[key] = 0;
            const slider = document.getElementById(key);
            const valueDisplay = document.getElementById(`${key}-value`);
            slider.value = 0;
            valueDisplay.textContent = '0';
        });
        
        if (this.originalImage) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.filter = 'none';
            this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Remove active state from filter presets
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="none"]').classList.add('active');
    }
    
    applyFilterPreset(filterName) {
        if (!this.originalImage) return;
        
        // Reset adjustments first
        this.resetAdjustments();
        
        const presets = {
            none: {},
            vintage: { brightness: -10, contrast: 20, saturation: -30, hue: 15, vignette: 30 },
            bw: { saturation: -100, contrast: 15 },
            sepia: { brightness: 10, contrast: 10, saturation: -20, hue: 30 },
            dramatic: { brightness: -15, contrast: 40, saturation: 20, vignette: 20 },
            cool: { brightness: 5, saturation: 10, hue: -20 },
            warm: { brightness: 10, saturation: 15, hue: 20 }
        };
        
        const preset = presets[filterName] || {};
        
        Object.keys(preset).forEach(key => {
            if (this.adjustments.hasOwnProperty(key)) {
                this.adjustments[key] = preset[key];
                const slider = document.getElementById(key);
                const valueDisplay = document.getElementById(`${key}-value`);
                if (slider) {
                    slider.value = preset[key];
                    valueDisplay.textContent = preset[key];
                }
            }
        });
        
        this.applyAdjustments();
    }
    
    setActivePreset(button) {
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    addLayer() {
        const newLayer = {
            id: this.layers.length,
            name: `Layer ${this.layers.length}`,
            opacity: 100,
            visible: true,
            data: null
        };
        
        this.layers.push(newLayer);
        this.updateLayersUI();
    }
    
    duplicateLayer() {
        const activeLayer = this.layers[this.activeLayer];
        const newLayer = {
            id: this.layers.length,
            name: `${activeLayer.name} Copy`,
            opacity: activeLayer.opacity,
            visible: activeLayer.visible,
            data: this.canvas.toDataURL()
        };
        
        this.layers.push(newLayer);
        this.updateLayersUI();
    }
    
    deleteLayer() {
        if (this.layers.length > 1) {
            this.layers.splice(this.activeLayer, 1);
            this.activeLayer = Math.max(0, this.activeLayer - 1);
            this.updateLayersUI();
        }
    }
    
    updateLayersUI() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const layerElement = document.createElement('div');
            layerElement.className = `layer-item ${index === this.activeLayer ? 'active' : ''}`;
            layerElement.dataset.layer = index;
            
            layerElement.innerHTML = `
                <div class="layer-preview"></div>
                <span class="layer-name">${layer.name}</span>
                <input type="range" class="layer-opacity" min="0" max="100" value="${layer.opacity}">
            `;
            
            layerElement.addEventListener('click', () => {
                this.activeLayer = index;
                this.updateLayersUI();
            });
            
            layersList.appendChild(layerElement);
        });
    }
    
    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
        }
    }
    
    restoreState(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataURL;
    }
    
    downloadImage() {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// Initialize the photo editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PhotoEditor();
});

// Handle window resize
window.addEventListener('resize', () => {
    // Trigger fit to screen if needed
    const editor = window.photoEditor;
    if (editor && editor.originalImage) {
        setTimeout(() => editor.fitToScreen(), 100);
    }
});
