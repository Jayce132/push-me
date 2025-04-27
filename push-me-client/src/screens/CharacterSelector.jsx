import React, { useEffect, useState, useRef } from 'react';
import './CharacterSelector.css';

export const CharacterSelector = ({ onSelect }) => {
    const [skins, setSkins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSkin, setSelectedSkin] = useState(null);

    const scrollRef = useRef(null);
    const containerRef = useRef(null);

    // 1) Load skins
    useEffect(() => {
        fetch('http://localhost:3001/skins')
            .then(res => res.json())
            .then(data => setSkins(data.freeSkins))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // 2) Auto-focus the scroll pane when ready
    useEffect(() => {
        if (!loading && scrollRef.current) {
            scrollRef.current.focus();
        }
    }, [loading]);

    // 3) Capture all wheel events inside this component, forward them horizontally
    useEffect(() => {
        const handleGlobalWheel = e => {
            if (
                containerRef.current &&
                containerRef.current.contains(e.target) &&
                scrollRef.current
            ) {
                scrollRef.current.scrollLeft += e.deltaX + e.deltaY;
                e.preventDefault();
            }
        };
        document.addEventListener('wheel', handleGlobalWheel, { passive: false });
        return () =>
            document.removeEventListener('wheel', handleGlobalWheel, {
                passive: false
            });
    }, []);

    // 4) When a skin is selected, listen for spacebar to confirm
    useEffect(() => {
        if (!selectedSkin) return;
        const handleSpace = e => {
            if (e.code === 'Space') {
                e.preventDefault();
                onSelect(selectedSkin);
            }
        };
        document.addEventListener('keydown', handleSpace);
        return () => document.removeEventListener('keydown', handleSpace);
    }, [selectedSkin, onSelect]);

    // 5) Clicking outside any button clears selection
    const handleContainerClick = e => {
        if (e.target.closest('.selector-button')) return;
        setSelectedSkin(null);
    };

    // Common UI for loading / no-skins
    const renderMessage = msg => (
        <div
            className="selector-container"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            <div className="title-container">
                <h1 className="selector-title">
                    {selectedSkin ? 'Spacebar' : 'Push Me'}
                </h1>
            </div>
            <div className="buttons-container" ref={scrollRef} tabIndex="0">
                <p>{msg}</p>
            </div>
        </div>
    );

    if (loading) return renderMessage('Loading skins…');
    if (skins.length === 0)
        return renderMessage('No skins available right now.');

    // Normal render
    return (
        <div
            className="selector-container"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            <div className="title-container">
                <h1 className="selector-title">
                    {selectedSkin ? 'Spacebar' : 'Push Me'}
                </h1>
            </div>
            <div className="buttons-container" ref={scrollRef} tabIndex="0">
                <div className="selector-list">
                    {skins.map(skin => (
                        <button
                            key={skin}
                            onClick={() => setSelectedSkin(skin)}
                            className={
                                'selector-button' +
                                (selectedSkin === skin ? ' selected' : '')
                            }
                        >
                            {skin}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CharacterSelector;
