import React, { useEffect, useState } from 'react';

export default function MediaGallery({ token, conversationId, onClose }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:4000/messages/${conversationId}?limit=1000`, {
            headers: { Authorization: 'Bearer ' + token }
        })
            .then(r => r.json())
            .then(data => {
                const msgs = data.messages || [];
                // Correct logic: Filter by type 'image' and existence of attachments
                const imgs = msgs
                    .filter(m => m.type === 'image' && m.attachments && m.attachments.length > 0)
                    .map(m => ({
                        _id: m._id,
                        url: `http://localhost:4000${m.attachments[0].url}`,
                        sender: m.sender
                    }));
                setImages(imgs);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [conversationId, token]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600, maxWidth: '90vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3>Shared Media</h3>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>}
                    {!loading && images.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No media found</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                        {images.map(img => (
                            <div key={img._id} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                                <img
                                    src={img.url}
                                    alt="shared"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => window.open(img.url, '_blank')}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
