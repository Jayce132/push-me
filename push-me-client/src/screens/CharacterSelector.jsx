import React, {useEffect, useState, useRef} from 'react';
import './CharacterSelector.css';
import {sounds} from '../sounds.js';

export const CharacterSelector = ({onSelect}) => {
    const [skins, setSkins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSkin, setSelectedSkin] = useState(null);
    const [muted, setMuted] = useState(false);               // 🔈 mute toggle

    const scrollRef = useRef(null);
    const containerRef = useRef(null);

    // 0) Play the background music once when we mount
    useEffect(() => {
        if (!sounds.music.playing()) sounds.music.play();
        // no cleanup: keep it until user mutes or leaves
    }, []);

    // 0.a) Mute/unmute whenever `muted` flips
    useEffect(() => {
        sounds.music.mute(muted);
    }, [muted]);

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
        if (!loading && scrollRef.current) scrollRef.current.focus();
    }, [loading]);

    // 3) Capture all wheel events inside this component, forward them horizontally
    useEffect(() => {
        const handleGlobalWheel = e => {
            if (
                containerRef.current?.contains(e.target) &&
                scrollRef.current
            ) {
                scrollRef.current.scrollLeft += e.deltaX + e.deltaY;
                e.preventDefault();
            }
        };
        document.addEventListener('wheel', handleGlobalWheel, {passive: false});
        return () => document.removeEventListener('wheel', handleGlobalWheel);
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
        if (
            e.target.closest('.selector-button') ||
            e.target.closest('.mute-button')
        ) return;
        setSelectedSkin(null);
    };

    // Toggle music mute/unmute
    const toggleMute = e => {
        e.stopPropagation();
        setMuted(m => !m);
    };

    // Common UI for loading / no-skins, includes mute button
    const renderMessage = msg => (
        <div
            className="selector-container"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            {/* 🔊 / 🔇 toggle */}
            {selectedSkin && <button className="mute-button" onClick={toggleMute}>
                {muted ? '🔇' : '🔊'}
            </button>}

            <div className="title-container">
                <h1 className="selector-title">
                    {selectedSkin ? 'Spacebar' : 'Push Me'}
                </h1>
            </div>

            <div className="buttons-container" ref={scrollRef} tabIndex="0">
                <p className="no-skins-message">{msg}</p>
            </div>
        </div>
    );

    // while we’re fetching skins, render nothing (avoids flashing a message)
    if (loading) return null;
    // once loading is done, if there really are no skins, show that message
    if (!loading && skins.length === 0) return renderMessage('No skins available right now.');

    // Normal render, includes animated emoji buttons
    return (
        <div
            className="selector-container"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            {/* 🔊 / 🔇 toggle */}
            {selectedSkin && <button className="mute-button" onClick={toggleMute}>
                {muted ? '🔇' : '🔊'}
            </button>}

            <div className="title-container">
                <h1 className="selector-title">
                    {selectedSkin ? 'Spacebar' : 'Push Me'}
                </h1>
            </div>

            <div className="buttons-container" ref={scrollRef} tabIndex="0">
                <div className="selector-list">
                    {skins.map((skin, i) => (
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
