// audio.js
(() => {
  window.AUDIO = window.AUDIO || {};
  let music = null, sfx = {};

  function initAudio() {
    if(music) return;
    try {
      music = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_d1fdf73e48.mp3?filename=retro-game-music-11077.mp3');
      music.loop = true;
      music.volume = parseFloat(document.getElementById('vol').value || 0.45);
      sfx.lock = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_ke1d3f6e27.mp3?filename=ui-click-5401.mp3');
      sfx.clear = new Audio('https://cdn.pixabay.com/download/audio/2022/03/31/audio_9e4b05a6cd.mp3?filename=line-clear.mp3');
      sfx.drop = new Audio('https://cdn.pixabay.com/download/audio/2022/03/23/audio_13b1a4f0fd.mp3?filename=small-foley-5708.mp3');
      Object.values(sfx).forEach(a => a && (a.volume = music.volume));
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  function setVolume(v) {
    if(music) music.volume = v;
    Object.values(sfx).forEach(a => a && (a.volume = v));
  }

  function play(name) {
    if(!sfx[name]) return;
    try { sfx[name].currentTime = 0; sfx[name].play(); } catch(e){}
  }

  window.AUDIO.init = initAudio;
  window.AUDIO.setVolume = setVolume;
  window.AUDIO.music = () => music;
  window.AUDIO.play = play;
})();
