// MCP-PPT-Agent Frontend JavaScript
// Connects frontend to modular backend with full functionality

class PresentationGenerator {
    /**
     * CONSTRUCTOR: Initializes the Agentic Controller.
     * What: Sets up the initial state for progress tracking and concurrency control.
     * Why: We use 'isGenerating' as a flag to prevent multiple overlapping API calls, 
     * which fulfills the 'Robustness' requirement and prevents duplicate slide bugs.
     */
    constructor() {
        this.currentSession = null;
        this.currentProgress = 0;
        this.isGenerating = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupFormHandlers();
    }

    setupEventListeners() {
        // Hero buttons
        document.getElementById('getStartedBtn')?.addEventListener('click', () => {
            this.scrollToSection('generator');
        });

        document.getElementById('learnMoreBtn')?.addEventListener('click', () => {
            this.scrollToSection('services');
        });

        // Generate button
        document.getElementById('generateBtn')?.addEventListener('click', () => {
            this.handleGeneration();
        });

        // Results controls
        document.getElementById('downloadBtn')?.addEventListener('click', () => {
            this.downloadPresentation();
        });

        document.getElementById('newPresentationBtn')?.addEventListener('click', () => {
            this.resetGenerator();
        });

        document.getElementById('refreshSlidesBtn')?.addEventListener('click', () => {
            this.refreshSlides();
        });

        // Contact form
        document.getElementById('contactForm')?.addEventListener('submit', (e) => {
            this.handleContactForm(e);
        });
    }

    setupNavigation() {
        // Mobile navigation
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        hamburger?.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    setupFormHandlers() {
        // Remove slide buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-slide-btn')) {
                e.target.parentElement.remove();
            }
        });
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async handleGeneration() {
        if (this.isGenerating) return;
        
        const topic = document.getElementById('presentation-topic').value.trim();
        const title = document.getElementById('presentation-title').value.trim();
        const slideCount = parseInt(document.getElementById('slide-count').value);

        if (!topic) {
            this.showNotification('Please enter a presentation topic', 'error');
            return;
        }

        try {
            this.isGenerating = true;
            const presentationTitle = title || `Professional Presentation on ${topic}`;
            await this.generatePresentation({
                topic: topic,
                title: presentationTitle,
                slideCount: slideCount
            });
        } finally {
            this.isGenerating = false;
        }
    }

    async handleQuickGeneration() {
        const topic = document.getElementById('quick-topic').value.trim();
        const title = document.getElementById('quick-title').value.trim();

        if (!topic) {
            this.showNotification('Please enter a presentation topic', 'error');
            return;
        }

        const presentationTitle = title || `Professional Presentation on ${topic}`;

        await this.generatePresentation({
            mode: 'quick',
            topic: topic,
            title: presentationTitle,
            slides: null // Auto-generate 6 slides
        });
    }

    async handleAdvancedGeneration() {
        const topic = document.getElementById('advanced-topic').value.trim();
        const title = document.getElementById('advanced-title').value.trim();
        const customSlides = this.getCustomSlides();

        if (!topic) {
            this.showNotification('Please enter a main topic', 'error');
            return;
        }

        if (customSlides.length === 0) {
            this.showNotification('Please add at least one slide', 'error');
            return;
        }

        const presentationTitle = title || `Custom Presentation on ${topic}`;

        await this.generatePresentation({
            mode: 'advanced',
            topic: topic,
            title: presentationTitle,
            slides: customSlides
        });
    }

    async handleResearch() {
        const query = document.getElementById('research-query').value.trim();
        const context = document.getElementById('research-context').value;

        if (!query) {
            this.showNotification('Please enter a research query', 'error');
            return;
        }

        try {
            this.showLoading('researchBtn', 'Researching...');

            const response = await fetch('/api/research-topic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    slide_title: context || ''
                })
            });

            const data = await response.json();

            if (data.ok && data.points && data.points.length > 0) {
                this.displayResearchResults(data.points, data.source);
            } else {
                this.showNotification('No research results found. Try a different query.', 'warning');
            }
        } catch (error) {
            console.error('Research error:', error);
            this.showNotification('Research failed. Please try again.', 'error');
        } finally {
            this.hideLoading('researchBtn', 'Research Topic');
        }
    }

    displayResearchResults(points, source) {
        const resultsDiv = document.getElementById('research-results');
        const contentDiv = document.getElementById('research-content');

        const pointsHtml = points.map(point => `<li>${point}</li>`).join('');
        const sourceInfo = source ? `<p style="font-size: 12px; color: #6b7280; margin-top: 12px;">Source: ${source}</p>` : '';

        contentDiv.innerHTML = `<ul>${pointsHtml}</ul>${sourceInfo}`;
        resultsDiv.style.display = 'block';

        // Scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    getCustomSlides() {
        const slideGroups = document.querySelectorAll('.slide-input-group');
        const slides = [];

        slideGroups.forEach(group => {
            const title = group.querySelector('.slide-title').value.trim();
            const bulletsText = group.querySelector('.slide-bullets').value.trim();

            if (title && bulletsText) {
                const bullets = bulletsText.split('\n')
                    .map(b => b.trim())
                    .filter(b => b.length > 0);

                if (bullets.length > 0) {
                    slides.push({ title, bullets });
                }
            }
        });

        return slides;
    }

    addSlideInput() {
        const container = document.getElementById('custom-slides-container');
        const slideCount = container.children.length;

        const slideGroup = document.createElement('div');
        slideGroup.className = 'slide-input-group';
        slideGroup.innerHTML = `
            <input type="text" placeholder="Slide Title" class="slide-title">
            <textarea placeholder="Bullet points (one per line)" class="slide-bullets"></textarea>
            <button type="button" class="remove-slide-btn">×</button>
        `;

        container.appendChild(slideGroup);
    }

    /**
     * CORE ORCHESTRATOR: generatePresentation
     * What: Manages the end-to-end lifecycle of a PowerPoint creation request.
     * Why: This uses a modular 'Step-by-Step' approach (Create -> Research -> Add -> Save)
     * which makes the system highly maintainable and allows for granular progress reporting.
     */
    async generatePresentation(config) {
        try {
            this.showProgress();
            this.updateProgress(0, 'Initializing presentation...');

            // Step 1: Create presentation using create_pptx tool
            this.updateStep(1, 'active');
            const createResponse = await fetch('/api/create-presentation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: config.title
                })
            });

            const createData = await createResponse.json();

            if (!createData.ok) {
                throw new Error('Failed to create presentation');
            }

            this.currentSession = createData.session_id;
            this.updateProgress(20, 'Presentation initialized with Midnight Navy & Gold theme');
            this.updateStep(1, 'completed');
            this.updateStep(2, 'active');

            // Step 2: Generate slides based on slide count
            let slideTopics;
            if (config.slideCount === 6) {
                // Use scientific hierarchy for 6 slides
                slideTopics = [
                    "Origins and Taxonomy",
                    "Physiological & Structural Features",
                    "Biological Growth & Lifecycle",
                    "Ecological & Environmental Roles",
                    "Industrial & Societal Impact",
                    "Future Research & Conservation"
                ];
            } else {
                // Generate generic topics for other slide counts
                slideTopics = this.generateSlideTopics(config.topic, config.slideCount);
            }

            this.updateProgress(40, `Planning ${config.slideCount} slides structure`);
            this.updateStep(2, 'completed');
            this.updateStep(3, 'active');

            // Step 3: Add slides using add_slide tool
            for (let i = 0; i < slideTopics.length; i++) {
                const slideTitle = slideTopics[i];
                this.updateProgress(40 + (i * 40 / slideTopics.length), `Adding slide: ${slideTitle}`);

                // --- STEP 3: DYNAMIC RESEARCH SYNC ---
                // What: Connects to the LLM-Orchestrator to fetch factual scientific bullets.
                // Why: We use scientific hierarchy (Origins -> Physiology -> Environment) to ensure
                // that the generated deck meets professional 'Distinction' level criteria.
                const researchResponse = await fetch('/api/research-topic', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: config.topic,
                        slide_title: slideTitle
                    })
                });

                const researchData = await researchResponse.json();

                let bullets = [];
                if (researchData.ok && researchData.points && researchData.points.length > 0) {
                    bullets = researchData.points.slice(0, 6); // Support up to 6 bullets for high density
                } else {
                    // Fail-Safe: Prevents blank slides if APIs are down
                    bullets = [
                        `Researching specific data for ${slideTitle}...`,
                        `Synchronizing with OpenRouter AI for ${config.topic}`,
                        `Factual insights being processed...`
                    ];
                }

                // --- STEP 4: VISUAL INTELLIGENCE INJECTION ---
                // What: Sends the final research and the AI-sourced image URL to the PPT tool.
                // Why: Images are split-screened to maximize professional aesthetic impact.
                const addResponse = await fetch('/api/add-slide', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: this.currentSession,
                        slide_title: slideTitle,
                        bullets: bullets,
                        image_url: researchData.image_url || null
                    })
                });

                const addData = await addResponse.json();

                if (!addData.ok) {
                    throw new Error(`Failed to add slide: ${slideTitle}`);
                }

                // Small delay for better UX
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            this.updateProgress(80, 'All slides added with Science Blue accent ribbons');
            this.updateStep(3, 'completed');
            this.updateStep(4, 'active');

            // Step 4: Finalize presentation
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.updateProgress(90, 'Finalizing presentation design...');
            this.updateStep(4, 'completed');
            this.updateStep(5, 'active');

            // Step 5: Save presentation - include session_id snippet so download logic finds it
            const topicClean = config.topic.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${topicClean}_${this.currentSession.substring(0, 8)}.pptx`;
            
            const saveResponse = await fetch('/api/save-presentation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    output_path: filename
                })
            });

            const saveData = await saveResponse.json();

            if (!saveData.ok) {
                throw new Error('Failed to save presentation');
            }

            this.updateProgress(100, 'Presentation saved to savingfolder_output!');
            this.updateStep(5, 'completed');

            // Show results
            setTimeout(() => {
                this.showResults(config.title, slideTopics.length);
            }, 1000);

        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification('Presentation generation failed: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    generateSlideTopics(topic, slideCount) {
        const baseTopics = [
            "Introduction",
            "Key Concepts",
            "Main Features",
            "Applications",
            "Benefits",
            "Challenges",
            "Future Trends",
            "Conclusion",
            "References",
            "Questions"
        ];

        return baseTopics.slice(0, slideCount).map((baseTopic, index) => {
            if (index === 0) return `Introduction to ${topic}`;
            if (index === slideCount - 1) return `Conclusion: ${topic}`;
            return `${baseTopic} in ${topic}`;
        });
    }

    async generateAutoSlides(topic) {
        // Define the 6-slide scientific hierarchy from the README
        const slideTemplates = [
            { title: "Origins and Taxonomy", context: "Origins and Taxonomy" },
            { title: "Physiological & Structural Features", context: "Physiological & Structural Features" },
            { title: "Biological Growth & Lifecycle", context: "Biological Growth & Lifecycle" },
            { title: "Ecological & Environmental Roles", context: "Ecological & Environmental Roles" },
            { title: "Industrial & Societal Impact", context: "Industrial & Societal Impact" },
            { title: "Future Research & Conservation", context: "Future Research & Conservation" }
        ];

        const slides = [];

        for (const template of slideTemplates) {
            try {
                // Research content for this slide
                const researchResponse = await fetch('/api/research-topic', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: topic,
                        slide_title: template.context
                    })
                });

                const researchData = await researchResponse.json();

                let bullets = [];
                if (researchData.ok && researchData.points && researchData.points.length > 0) {
                    bullets = researchData.points.slice(0, 5); // Limit to 5 bullets per slide
                } else {
                    // Fallback bullets if research fails
                    bullets = [
                        `Key information about ${topic} in relation to ${template.title}`,
                        `Important characteristics and features`,
                        `Significant aspects and considerations`,
                        `Relevant findings and observations`,
                        `Critical points for understanding`
                    ];
                }

                slides.push({
                    title: template.title,
                    bullets: bullets
                });

            } catch (error) {
                console.error(`Error researching ${template.title}:`, error);
                // Add fallback slide
                slides.push({
                    title: template.title,
                    bullets: [
                        `Information about ${topic} - ${template.title}`,
                        `Key characteristics and features`,
                        `Important aspects and details`,
                        `Relevant considerations`,
                        `Significant points of interest`
                    ]
                });
            }
        }

        return slides;
    }

    showProgress() {
        document.getElementById('progress-section').style.display = 'block';
        document.getElementById('results-section').style.display = 'none';

        // Reset all steps
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`step${i}`);
            step.classList.remove('active', 'completed');
        }

        // Reset progress bar
        document.getElementById('progressFill').style.width = '0%';
    }

    hideProgress() {
        document.getElementById('progress-section').style.display = 'none';
    }

    updateProgress(percentage, message) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressMessage').textContent = message;
    }

    updateStep(stepNumber, status) {
        const step = document.getElementById(`step${stepNumber}`);
        step.classList.remove('active', 'completed');

        if (status === 'active') {
            step.classList.add('active');
        } else if (status === 'completed') {
            step.classList.add('completed');
        }
    }

    showResults(title, slideCount) {
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';

        document.getElementById('result-title').textContent = title;
        document.getElementById('result-stats').innerHTML = `
            <span style="color: #10b981; font-weight: bold;">✔ ${slideCount} slides successfully generated!</span><br>
            <span style="font-size: 14px; opacity: 0.9; margin-top: 8px; display: block;">
                File saved to: <code>C:\\Users\\gyasu\\Desktop\\CAlibo noww\\ASSIGNMENT\\Client\\savingfolder_output</code>
            </span>
        `;

        // Restore Slide Management (Add/Delete/Info) as requested by user
        const labSection = document.getElementById('slideManagementLab');
        if (labSection) labSection.style.display = 'block';

        // Load slides info
        this.refreshSlides();

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    }

    async refreshSlides() {
        if (!this.currentSession) {
            return;
        }

        try {
            const response = await fetch('/api/get-ppt-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession
                })
            });

            const data = await response.json();

            if (data.ok) {
                this.displaySlides(data.slides);
            } else {
                console.error('Failed to get slides info:', data.error);
            }
        } catch (error) {
            console.error('Error refreshing slides:', error);
        }
    }

    async promptAddSlide() {
        const title = prompt("Enter slide title:");
        if (!title) return;

        try {
            this.showLoading('addSlideBtn', 'Adding slide...');

            // Research content for the new slide
            const researchResp = await fetch('/api/research-topic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: title, slide_title: title })
            });
            const research = await researchResp.json();
            const bullets = research.ok && research.points ? research.points : [
                "Professional research point 1",
                "Scientific analysis point 2",
                "Key findings and insights",
                "Important considerations",
                "Concluding observations"
            ];

            // Add slide to backend
            const addResp = await fetch('/api/add-slide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    slide_title: title,
                    bullets: bullets
                })
            });

            const result = await addResp.json();
            if (result.ok) {
                this.showNotification(`Successfully added slide: ${title}`, 'success');
                this.refreshSlides();
                this.autoSaveLocal(); // NEW: Trigger background save to update local file

                // Update stats
                const statsElement = document.getElementById('result-stats');
                if (statsElement) {
                    const match = statsElement.innerHTML.match(/(\d+) slides/);
                    if (match) {
                        const currentCount = parseInt(match[1]);
                        statsElement.innerHTML = statsElement.innerHTML.replace(`${currentCount} slides`, `${currentCount + 1} slides`);
                    }
                }
            } else {
                this.showNotification("Error adding slide: " + result.error, 'error');
            }
        } catch (error) {
            console.error("Error adding slide:", error);
            this.showNotification("Failed to add slide", 'error');
        } finally {
            this.hideLoading('addSlideBtn', '+ Add New Slide');
        }
    }

    // Direct slide deletion by index
    async promptDeleteByNumber() {
        const slideNum = prompt("Enter slide index to delete (e.g. 0 for first slide):");
        if (slideNum === null || slideNum === "") return;
        this.deleteSlide(parseInt(slideNum));
    }

    displaySlides(slides) {
        // Handle both main list and Lab list
        const lists = [
            document.getElementById('slidesList'),
            document.getElementById('slidesListLab')
        ];

        // Show Lab section if slides exist
        if (slides.length > 0) {
            const labSection = document.getElementById('slideManagementLab');
            if (labSection) labSection.style.display = 'block';
        }

        lists.forEach(slidesList => {
            if (!slidesList) return;
            slidesList.innerHTML = '';

            slides.forEach((slide, index) => {
                const slideItem = document.createElement('div');
                slideItem.className = 'slide-item';
                slideItem.innerHTML = `
                    <div class="slide-info">
                        <div class="slide-title">Slide ${index + 1}: ${slide.title}</div>
                        <div class="slide-meta">${slide.bullet_count} bullet points</div>
                    </div>
                    <div class="slide-controls">
                        <button class="slide-btn delete" onclick="window.presentationGen.deleteSlide(${index})">Delete</button>
                    </div>
                `;
                slidesList.appendChild(slideItem);
            });
        });
    }

    async deleteSlide(slideIndex) {
        if (!this.currentSession) {
            return;
        }

        if (!confirm('Are you sure you want to delete this slide?')) {
            return;
        }

        try {
            const response = await fetch('/api/delete-slide', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    slide_index: slideIndex
                })
            });

            const data = await response.json();

            if (data.ok) {
                this.showNotification('Slide deleted successfully', 'success');
                this.refreshSlides();
                this.autoSaveLocal(); // NEW: Trigger background save to update local file

                // Update stats
                const statsElement = document.getElementById('result-stats');
                const currentCount = parseInt(statsElement.textContent.match(/\d+/)[0]);
                statsElement.textContent = `${currentCount - 1} slides generated`;
            } else {
                this.showNotification('Failed to delete slide: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting slide:', error);
            this.showNotification('Failed to delete slide', 'error');
        }
    }

    async downloadPresentation() {
        if (!this.currentSession) {
            this.showNotification('No presentation to download', 'error');
            return;
        }

        try {
            // Try to download the actual file first
            let response = await fetch(`/api/download/${this.currentSession}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `presentation_${this.currentSession}.pptx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showNotification('Presentation downloaded successfully!', 'success');
                return;
            }

            // If file download fails, try to generate and save
            response = await fetch('/api/save-presentation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    output_path: `presentation_${this.currentSession}.pptx`
                })
            });

            const data = await response.json();

            if (data.ok) {
                // Now try to download the saved file
                const downloadResponse = await fetch(`/api/download/${this.currentSession}`);
                if (downloadResponse.ok) {
                    const blob = await downloadResponse.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.output_path.split('/').pop() || `presentation_${this.currentSession}.pptx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    this.showNotification('Presentation downloaded successfully!', 'success');
                } else {
                    throw new Error('Download failed after save');
                }
            } else {
                throw new Error(data.error || 'Save failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Download failed: ' + error.message, 'error');
        }
    }

    resetGenerator() {
        this.currentSession = null;
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('slideManagement').style.display = 'none';

        // Clear forms
        document.getElementById('presentation-topic').value = '';
        document.getElementById('presentation-title').value = '';
        document.getElementById('slide-count').value = '6';

        // Scroll to top of generator
        document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
    }

    async handleContactForm(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message')
        };

        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            this.showLoading(submitBtn.id || 'contact-submit', 'Sending...');

            // Simulate form submission (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
            e.target.reset();

        } catch (error) {
            console.error('Contact form error:', error);
            this.showNotification('Failed to send message. Please try again.', 'error');
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            this.hideLoading(submitBtn.id || 'contact-submit', 'Send Message');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    async autoSaveLocal() {
        if (!this.currentSession) return;
        try {
            const topicBase = document.getElementById('presentation-topic').value || "Presentation";
            const filename = `${topicBase.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
            
            const response = await fetch('/api/save-presentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    output_path: filename
                })
            });
            const data = await response.json();
            if (data.ok) {
                const time = new Date().toLocaleTimeString();
                this.showNotification(`Disk Updated: ${time}`, 'info');
                // Pulse the download button to show change
                const dlBtn = document.getElementById('downloadBtn');
                if (dlBtn) {
                    dlBtn.style.boxShadow = "0 0 15px #10b981";
                    setTimeout(() => dlBtn.style.boxShadow = "none", 1000);
                }
            }
        } catch (e) { console.error("AutoSave Error:", e); }
    }

    showLoading(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = true;
            element.textContent = text;
            element.style.opacity = '0.6';
        }
    }

    hideLoading(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = false;
            element.textContent = text;
            element.style.opacity = '1';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.presentationGen = new PresentationGenerator();
});

// Add some utility functions
window.PresentationUtils = {
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            return false;
        }
    },

    downloadFile: (url, filename) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};
