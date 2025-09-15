class PhotoEditor {
    constructor() {
        this.layersContainer = document.getElementById('layers-container');
        this.originalImage = null;
        this.history = [];
        this.historyStep = -1;
        this.historyMax = 10;
        this.zoom = 1;
        this.currentTool = 'select';
        this.imageWidth = 0;
        this.imageHeight = 0;
        
        this.layers = [
            { 
                id: 0, 
                name: 'Background', 
                opacity: 100, 
                visible: true, 
                canvas: null, 
                originalData: null,
                adjustments: {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    hue: 0,
                    blur: 0,
                    vignette: 0
                }
            }
        ];
        this.activeLayer = 0;
        
        // Tool properties
        this.isDrawing = false;
        this.isDragging = false;
        this.toolStartX = 0;
        this.toolStartY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.brushSize = 5;
        this.brushColor = '#000000';
        this.fontSize = 20;
        this.textColor = '#000000';
        this.shapeType = 'rect';
        this.shapeColor = '#000000';
        
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
        
        // Canvas mouse events (attached to layersContainer since it's the parent)
        this.layersContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.layersContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.layersContainer.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.layersContainer.addEventListener('mouseout', this.handleMouseUp.bind(this));
        
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
        ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'vignette'].forEach(adjustment => {
            const slider = document.getElementById(adjustment);
            const valueDisplay = document.getElementById(`${adjustment}-value`);
            
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.layers[this.activeLayer].adjustments[adjustment] = value;
                valueDisplay.textContent = value;
                this.applyLayerAdjustments(this.activeLayer);
                this.saveState();
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
        this.updateLayersUI();
        this.layersContainer.style.transform = `scale(${this.zoom})`;
        this.layersContainer.style.transformOrigin = 'center';
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
                this.imageWidth = img.width;
                this.imageHeight = img.height;
                
                const canvas = document.createElement('canvas');
                canvas.width = this.imageWidth;
                canvas.height = this.imageHeight;
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.opacity = 1;
                canvas.style.display = 'block';
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                this.layers[0].canvas = canvas;
                this.layers[0].originalData = canvas.toDataURL();
                this.layersContainer.appendChild(canvas);
                
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
        
        const optionsContent = document.getElementById('options-content');
        optionsContent.innerHTML = '';
        
        let optionsHTML = '';
        
        if (tool === 'brush' || tool === 'eraser') {
            optionsHTML += `
                <div class="adjustment-group">
                    <label>Size</label>
                    <input type="range" id="brush-size" min="1" max="50" value="${this.brushSize}">
                </div>
            `;
            if (tool === 'brush') {
                optionsHTML += `
                    <div class="adjustment-group">
                        <label>Color</label>
                        <input type="color" id="brush-color" value="${this.brushColor}">
                    </div>
                `;
            }
        } else if (tool === 'text') {
            optionsHTML += `
                <div class="adjustment-group">
                    <label>Font Size</label>
                    <input type="number" id="font-size" min="1" max="100" value="${this.fontSize}">
                </div>
                <div class="adjustment-group">
                    <label>Color</label>
                    <input type="color" id="text-color" value="${this.textColor}">
                </div>
            `;
        } else if (tool === 'shape') {
            optionsHTML += `
                <div class="adjustment-group">
                    <label>Shape</label>
                    <select id="shape-type">
                        <option value="rect" ${this.shapeType === 'rect' ? 'selected' : ''}>Rectangle</option>
                        <option value="circle" ${this.shapeType === 'circle' ? 'selected' : ''}>Circle</option>
                    </select>
                </div>
                <div class="adjustment-group">
                    <label>Fill Color</label>
                    <input type="color" id="shape-color" value="${this.shapeColor}">
                </div>
            `;
        }
        
        optionsContent.innerHTML = optionsHTML;
        
        // Add listeners for options
        if (tool === 'brush' || tool === 'eraser') {
            document.getElementById('brush-size').addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value);
            });
            if (tool === 'brush') {
                document.getElementById('brush-color').addEventListener('input', (e) => {
                    this.brushColor = e.target.value;
                });
            }
        } else if (tool === 'text') {
            document.getElementById('font-size').addEventListener('input', (e) => {
                this.fontSize = parseInt(e.target.value);
            });
            document.getElementById('text-color').addEventListener('input', (e) => {
                this.textColor = e.target.value;
            });
        } else if (tool === 'shape') {
            document.getElementById('shape-type').addEventListener('change', (e) => {
                this.shapeType = e.target.value;
            });
            document.getElementById('shape-color').addEventListener('input', (e) => {
                this.shapeColor = e.target.value;
            });
        }
    }
    
    getMousePosition(e) {
        const rect = this.layersContainer.getBoundingClientRect();
        return [
            (e.clientX - rect.left) / this.zoom,
            (e.clientY - rect.top) / this.zoom
        ];
    }
    
    handleMouseDown(e) {
        if (!this.layers.length) return;
        
        const [x, y] = this.getMousePosition(e);
        const activeCtx = this.layers[this.activeLayer].canvas.getContext('2d');
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.isDrawing = true;
            [this.lastX, this.lastY] = [x, y];
        } else if (this.currentTool === 'crop' || this.currentTool === 'shape') {
            this.isDragging = true;
            this.toolStartX = x;
            this.toolStartY = y;
            document.getElementById('crop-overlay').style.display = 'block';
        } else if (this.currentTool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                activeCtx.font = `${this.fontSize}px Arial`;
                activeCtx.fillStyle = this.textColor;
                activeCtx.fillText(text, x, y);
                this.saveState();
            }
        }
    }
    
    handleMouseMove(e) {
        if (!this.layers.length) return;
        
        const [x, y] = this.getMousePosition(e);
        const activeCtx = this.layers[this.activeLayer].canvas.getContext('2d');
        
        if (this.isDrawing && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
            activeCtx.beginPath();
            activeCtx.moveTo(this.lastX, this.lastY);
            activeCtx.lineTo(x, y);
            activeCtx.strokeStyle = this.brushColor;
            activeCtx.lineWidth = this.brushSize;
            activeCtx.lineCap = 'round';
            activeCtx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
            activeCtx.stroke();
            [this.lastX, this.lastY] = [x, y];
        } else if (this.isDragging && (this.currentTool === 'crop' || this.currentTool === 'shape')) {
            const cropX = Math.min(this.toolStartX, x);
            const cropY = Math.min(this.toolStartY, y);
            const cropW = Math.abs(x - this.toolStartX);
            const cropH = Math.abs(y - this.toolStartY);
            
            const wrapperRect = document.querySelector('.canvas-wrapper').getBoundingClientRect();
            const layersRect = this.layersContainer.getBoundingClientRect();
            
            const overlay = document.getElementById('crop-overlay');
            overlay.style.left = `${(layersRect.left - wrapperRect.left) + cropX * this.zoom}px`;
            overlay.style.top = `${(layersRect.top - wrapperRect.top) + cropY * this.zoom}px`;
            overlay.style.width = `${cropW * this.zoom}px`;
            overlay.style.height = `${cropH * this.zoom}px`;
        }
    }
    
    handleMouseUp(e) {
        if (!this.layers.length) return;
        
        const activeCtx = this.layers[this.activeLayer].canvas.getContext('2d');
        activeCtx.globalCompositeOperation = 'source-over';
        
        if (this.isDrawing) {
            this.isDrawing = false;
            this.updateLayerOriginalAfterEdit(this.activeLayer);
            this.saveState();
        } else if (this.isDragging) {
            const [currentX, currentY] = this.getMousePosition(e);
            const cropX = Math.min(this.toolStartX, currentX);
            const cropY = Math.min(this.toolStartY, currentY);
            const cropW = Math.abs(currentX - this.toolStartX);
            const cropH = Math.abs(currentY - this.toolStartY);
            
            document.getElementById('crop-overlay').style.display = 'none';
            this.isDragging = false;
            
            if (this.currentTool === 'crop') {
                this.cropAllLayers(cropX, cropY, cropW, cropH);
            } else if (this.currentTool === 'shape') {
                activeCtx.fillStyle = this.shapeColor;
                if (this.shapeType === 'rect') {
                    activeCtx.fillRect(cropX, cropY, cropW, cropH);
                } else if (this.shapeType === 'circle') {
                    activeCtx.beginPath();
                    activeCtx.arc(cropX + cropW / 2, cropY + cropH / 2, Math.min(cropW, cropH) / 2, 0, 2 * Math.PI);
                    activeCtx.fill();
                }
                this.updateLayerOriginalAfterEdit(this.activeLayer);
                this.saveState();
            }
        }
    }
    
    updateLayerOriginalAfterEdit(layerIndex) {
        const layer = this.layers[layerIndex];
        layer.originalData = layer.canvas.toDataURL();
    }
    
    cropAllLayers(cropX, cropY, cropW, cropH) {
        if (cropW === 0 || cropH === 0) return;
        
        this.layers.forEach(layer => {
            const ctx = layer.canvas.getContext('2d');
            const imageData = ctx.getImageData(cropX, cropY, cropW, cropH);
            layer.canvas.width = cropW;
            layer.canvas.height = cropH;
            ctx.putImageData(imageData, 0, 0);
            layer.originalData = layer.canvas.toDataURL();
        });
        
        this.imageWidth = cropW;
        this.imageHeight = cropH;
        this.saveState();
        this.fitToScreen();
    }
    
    rotate(degrees) {
        const is90 = Math.abs(degrees) === 90;
        const newWidth = is90 ? this.imageHeight : this.imageWidth;
        const newHeight = is90 ? this.imageWidth : this.imageHeight;
        
        this.layers.forEach((layer, index) => {
            if (!layer.originalData) return;
            
            const img = new Image();
            img.src = layer.originalData;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCtx.translate(newWidth / 2, newHeight / 2);
                tempCtx.rotate(degrees * Math.PI / 180);
                tempCtx.drawImage(img, -img.width / 2, -img.height / 2);
                
                layer.originalData = tempCanvas.toDataURL();
                layer.canvas.width = newWidth;
                layer.canvas.height = newHeight;
                this.applyLayerAdjustments(index);
            };
        });
        
        this.imageWidth = newWidth;
        this.imageHeight = newHeight;
        this.saveState();
        this.fitToScreen();
    }
    
    flip(direction) {
        this.layers.forEach((layer, index) => {
            if (!layer.originalData) return;
            
            const img = new Image();
            img.src = layer.originalData;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                if (direction === 'horizontal') {
                    tempCtx.scale(-1, 1);
                    tempCtx.drawImage(img, -img.width, 0);
                } else {
                    tempCtx.scale(1, -1);
                    tempCtx.drawImage(img, 0, -img.height);
                }
                
                layer.originalData = tempCanvas.toDataURL();
                this.applyLayerAdjustments(index);
            };
        });
        
        this.saveState();
    }
    
    setZoom(newZoom) {
        this.zoom = Math.max(0.1, Math.min(5, newZoom));
        this.layersContainer.style.transform = `scale(${this.zoom})`;
        this.updateZoomInfo();
    }
    
    fitToScreen() {
        if (!this.imageWidth || !this.imageHeight) return;
        
        const container = document.querySelector('.canvas-wrapper');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.imageWidth;
        const scaleY = containerHeight / this.imageHeight;
        
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
    
    applyLayerAdjustments(layerIndex) {
        const layer = this.layers[layerIndex];
        if (!layer.originalData) return;
        
        const img = new Image();
        img.onload = () => {
            const ctx = layer.canvas.getContext('2d');
            ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            
            let filters = [];
            const adj = layer.adjustments;
            
            if (adj.brightness !== 0) filters.push(`brightness(${100 + adj.brightness}%)`);
            if (adj.contrast !== 0) filters.push(`contrast(${100 + adj.contrast}%)`);
            if (adj.saturation !== 0) filters.push(`saturate(${100 + adj.saturation}%)`);
            if (adj.hue !== 0) filters.push(`hue-rotate(${adj.hue}deg)`);
            if (adj.blur > 0) filters.push(`blur(${adj.blur}px)`);
            
            ctx.filter = filters.join(' ') || 'none';
            ctx.drawImage(img, 0, 0);
            
            if (adj.vignette > 0) {
                this.applyVignette(ctx, adj.vignette, layer.canvas.width, layer.canvas.height);
            }
            
            ctx.filter = 'none';
        };
        img.src = layer.originalData;
    }
    
    applyVignette(ctx, intensity, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.sqrt(centerX ** 2 + centerY ** 2);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    resetAdjustments() {
        const layer = this.layers[this.activeLayer];
        Object.keys(layer.adjustments).forEach(key => {
            layer.adjustments[key] = 0;
            const slider = document.getElementById(key);
            const valueDisplay = document.getElementById(`${key}-value`);
            if (slider) {
                slider.value = 0;
                valueDisplay.textContent = '0';
            }
        });
        
        this.applyLayerAdjustments(this.activeLayer);
        this.saveState();
        
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="none"]').classList.add('active');
    }
    
    applyFilterPreset(filterName) {
        const layer = this.layers[this.activeLayer];
        
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
            layer.adjustments[key] = preset[key];
            const slider = document.getElementById(key);
            const valueDisplay = document.getElementById(`${key}-value`);
            if (slider) {
                slider.value = preset[key];
                valueDisplay.textContent = preset[key];
            }
        });
        
        this.applyLayerAdjustments(this.activeLayer);
        this.saveState();
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
            canvas: null,
            originalData: null,
            adjustments: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                hue: 0,
                blur: 0,
                vignette: 0
            }
        };
        
        const canvas = document.createElement('canvas');
        canvas.width = this.imageWidth;
        canvas.height = this.imageHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.opacity = 1;
        canvas.style.display = 'block';
        
        newLayer.canvas = canvas;
        newLayer.originalData = canvas.toDataURL(); // transparent
        
        this.layersContainer.appendChild(canvas);
        this.layers.push(newLayer);
        this.activeLayer = this.layers.length - 1;
        this.updateLayersUI();
        this.updateAdjustmentSliders();
        this.saveState();
    }
    
    duplicateLayer() {
        const activeLayer = this.layers[this.activeLayer];
        const newLayer = {
            id: this.layers.length,
            name: `${activeLayer.name} Copy`,
            opacity: activeLayer.opacity,
            visible: activeLayer.visible,
            canvas: null,
            originalData: activeLayer.canvas.toDataURL(),
            adjustments: {...activeLayer.adjustments}
        };
        
        const canvas = document.createElement('canvas');
        canvas.width = this.imageWidth;
        canvas.height = this.imageHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.opacity = activeLayer.opacity / 100;
        canvas.style.display = activeLayer.visible ? 'block' : 'none';
        
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = newLayer.originalData;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        
        newLayer.canvas = canvas;
        this.layersContainer.appendChild(canvas);
        this.layers.push(newLayer);
        this.activeLayer = this.layers.length - 1;
        this.updateLayersUI();
        this.updateAdjustmentSliders();
        this.saveState();
    }
    
    deleteLayer() {
        if (this.layers.length <= 1) return;
        
        this.layersContainer.removeChild(this.layers[this.activeLayer].canvas);
        this.layers.splice(this.activeLayer, 1);
        this.activeLayer = Math.max(0, this.activeLayer - 1);
        this.updateLayersUI();
        this.updateAdjustmentSliders();
        this.saveState();
    }
    
    updateLayersUI() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const layerElement = document.createElement('div');
            layerElement.className = `layer-item ${index === this.activeLayer ? 'active' : ''}`;
            layerElement.dataset.layer = index;
            
            layerElement.innerHTML = `
                <input type="checkbox" class="layer-visible" ${layer.visible ? 'checked' : ''}>
                <div class="layer-preview"></div>
                <span class="layer-name">${layer.name}</span>
                <input type="range" class="layer-opacity" min="0" max="100" value="${layer.opacity}">
            `;
            
            layerElement.querySelector('.layer-visible').addEventListener('change', (e) => {
                layer.visible = e.target.checked;
                layer.canvas.style.display = layer.visible ? 'block' : 'none';
                this.saveState();
            });
            
            layerElement.querySelector('.layer-opacity').addEventListener('input', (e) => {
                layer.opacity = parseInt(e.target.value);
                layer.canvas.style.opacity = layer.opacity / 100;
                this.saveState();
            });
            
            layerElement.addEventListener('click', () => {
                this.activeLayer = index;
                this.updateLayersUI();
                this.updateAdjustmentSliders();
            });
            
            layersList.appendChild(layerElement);
        });
    }
    
    updateAdjustmentSliders() {
        const adj = this.layers[this.activeLayer].adjustments;
        Object.keys(adj).forEach(key => {
            const slider = document.getElementById(key);
            const valueDisplay = document.getElementById(`${key}-value`);
            if (slider) {
                slider.value = adj[key];
                valueDisplay.textContent = adj[key];
            }
        });
    }
    
    saveState() {
        this.history = this.history.slice(0, this.historyStep + 1);
        
        const state = {
            layers: this.layers.map(l => ({
                id: l.id,
                name: l.name,
                opacity: l.opacity,
                visible: l.visible,
                adjustments: {...l.adjustments},
                originalData: l.originalData,
                currentData: l.canvas.toDataURL()
            })),
            activeLayer: this.activeLayer,
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight
        };
        
        this.history.push(state);
        this.historyStep = this.history.length - 1;
        
        if (this.history.length > this.historyMax) {
            this.history.shift();
            this.historyStep--;
        }
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
    
    restoreState(state) {
        this.imageWidth = state.imageWidth;
        this.imageHeight = state.imageHeight;
        this.activeLayer = state.activeLayer;
        
        this.layersContainer.innerHTML = '';
        this.layers = state.layers.map(l => {
            const canvas = document.createElement('canvas');
            canvas.width = this.imageWidth;
            canvas.height = this.imageHeight;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.opacity = l.opacity / 100;
            canvas.style.display = l.visible ? 'block' : 'none';
            
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = l.currentData;
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
            
            this.layersContainer.appendChild(canvas);
            
            return {
                ...l,
                canvas
            };
        });
        
        this.updateLayersUI();
        this.updateAdjustmentSliders();
        this.fitToScreen();
    }
    
    downloadImage() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.imageWidth;
        tempCanvas.height = this.imageHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        this.layers.forEach(layer => {
            if (layer.visible) {
                tempCtx.globalAlpha = layer.opacity / 100;
                tempCtx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = tempCanvas.toDataURL();
        link.click();
    }
}

// Initialize the photo editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});

// Handle window resize
window.addEventListener('resize', () => {
    const editor = window.photoEditor;
    if (editor && editor.imageWidth) {
        setTimeout(() => editor.fitToScreen(), 100);
    }
});
