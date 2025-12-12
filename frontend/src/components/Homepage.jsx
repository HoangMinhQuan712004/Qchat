import React from 'react';

export default function Homepage({ onStartConversation, onOpenSettings, user }) {
    const greeting = getGreeting();

    return (
        <div className="homepage-container">
            <div className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        {greeting}, <span className="highlight-text">{user?.displayName || user?.username || 'User'}</span>!
                    </h1>
                    <p className="hero-subtitle">
                        Welcome to <span className="brand-name">Qchat</span>.
                        Connect with friends, create groups, and chat securely.
                    </p>
                    <div className="hero-actions">
                        <button className="btn primary-btn" onClick={onStartConversation}>
                            Start Messaging
                        </button>
                        <button className="btn secondary-btn" onClick={onOpenSettings}>
                            Customize Profile
                        </button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="floating-bubble bubble-1"></div>
                    <div className="floating-bubble bubble-2"></div>
                    <div className="floating-bubble bubble-3"></div>
                </div>
            </div>

            <div className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon">🚀</div>
                    <h3>Lightning Fast</h3>
                    <p>Real-time messaging with zero latency.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <h3>Secure</h3>
                    <p>Your conversations are private and safe.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">✨</div>
                    <h3>Modern Design</h3>
                    <p>A beautiful interface for the best experience.</p>
                </div>
            </div>
        </div>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}
