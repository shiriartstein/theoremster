/*
 * Theorem Timeline: online play.
 * Browsers connect directly to each other (WebRTC, via the PeerJS library in
 * vendor/). A public PeerJS server only introduces the browsers; game data goes
 * straight between them. The host's browser runs the game; guests send their
 * moves to it and receive the new state after every move.
 */
(function () {
  'use strict';
  const PREFIX = 'theorem-timeline-';
  const LIBRARY = 'vendor/peerjs.min.js';
  let loading = null;

  function loadLibrary() {
    if (window.Peer) return Promise.resolve();
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = LIBRARY;
        script.onload = () => resolve();
        script.onerror = () => { loading = null; reject(new Error('The online-play library could not be loaded.')); };
        document.head.append(script);
      });
    }
    return loading;
  }

  // Tests can point at a local PeerJS server with ?peer=host:port.
  function options() {
    const custom = new URLSearchParams(location.search).get('peer');
    if (!custom) return { debug: 0 };
    const [host, port] = custom.split(':');
    return { host, port: Number(port) || 9000, path: '/', secure: false, debug: 0 };
  }

  function randomCode(length = 8) {
    const letters = 'abcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => letters[b % letters.length]).join('');
  }

  /**
   * Host a game under `code`. Calls:
   *   onMessage(peerId, message)   a guest sent something
   *   onLeave(peerId)              a guest's connection closed
   *   onStatus(status, detail)     'ready' | 'retrying' | 'error'
   */
  function host(code, { onMessage, onLeave, onStatus }) {
    const connections = new Map();
    let peer = null, closed = false, attempts = 0;
    function start() {
      peer = new window.Peer(PREFIX + code, options());
      peer.on('open', () => { attempts = 0; onStatus('ready'); });
      peer.on('connection', conn => {
        conn.on('open', () => connections.set(conn.peer, conn));
        conn.on('data', data => onMessage(conn.peer, data));
        conn.on('close', () => { connections.delete(conn.peer); onLeave(conn.peer); });
        conn.on('error', () => { connections.delete(conn.peer); onLeave(conn.peer); });
      });
      peer.on('disconnected', () => { if (!closed && !peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) { /* retried below */ } }, 1500); });
      peer.on('error', error => {
        if (closed) return;
        // After a reload the server may still remember the old connection for a few seconds.
        if ((error.type === 'unavailable-id' || error.type === 'network' || error.type === 'server-error' || error.type === 'socket-error') && attempts < 20) {
          attempts++; onStatus('retrying');
          try { peer.destroy(); } catch (e) { /* ignore */ }
          setTimeout(() => { if (!closed) start(); }, 2500);
        } else if (error.type !== 'peer-unavailable') onStatus('error', error.message || String(error.type));
      });
    }
    start();
    return {
      send(peerId, message) { const conn = connections.get(peerId); if (conn && conn.open) conn.send(message); },
      connected(peerId) { return connections.has(peerId); },
      close() { closed = true; if (peer) peer.destroy(); }
    };
  }

  /**
   * Join the game hosted under `code`. Calls:
   *   onMessage(message)
   *   onStatus(status, detail)   'connected' | 'waiting' | 'error'
   */
  function join(code, { onMessage, onStatus }) {
    let peer = null, conn = null, closed = false, timer = null;
    function retry(delay = 3000) {
      if (closed || timer) return;
      timer = setTimeout(() => { timer = null; connect(); }, delay);
    }
    function connect() {
      if (closed) return;
      if (!peer || peer.destroyed) {
        peer = new window.Peer(options());
        peer.on('open', () => connect());
        peer.on('disconnected', () => { if (!closed && !peer.destroyed) { try { peer.reconnect(); } catch (e) { /* ignore */ } } });
        peer.on('error', error => {
          if (closed) return;
          if (error.type === 'peer-unavailable') { onStatus('waiting'); retry(); }
          else if (error.type === 'network' || error.type === 'server-error' || error.type === 'socket-error') { onStatus('waiting'); try { peer.destroy(); } catch (e) { /* ignore */ } retry(4000); }
          else onStatus('error', error.message || String(error.type));
        });
        return;
      }
      if (!peer.open) return;
      if (conn) { try { conn.close(); } catch (e) { /* ignore */ } }
      const attempt = peer.connect(PREFIX + code, { reliable: true });
      conn = attempt;
      attempt.on('open', () => { if (conn === attempt) onStatus('connected'); });
      attempt.on('data', data => { if (conn === attempt) onMessage(data); });
      attempt.on('close', () => { if (conn === attempt && !closed) { onStatus('waiting'); retry(); } });
      attempt.on('error', () => { if (conn === attempt && !closed) { onStatus('waiting'); retry(); } });
    }
    connect();
    return {
      send(message) { if (conn && conn.open) { conn.send(message); return true; } return false; },
      close() { closed = true; clearTimeout(timer); if (peer) peer.destroy(); }
    };
  }

  window.TimelineOnline = { loadLibrary, host, join, randomCode };
})();
