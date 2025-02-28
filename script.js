const TASK_URL = 'https://lootdest.org/s?KTz9Kydo';
let taskCompleted = false;
let currentHwid = null;
let verificationToken = null;

document.addEventListener('DOMContentLoaded', function() {
  const redirectCard = document.getElementById('redirectCard');
  const keyCard = document.getElementById('keyCard');
  const step1Status = document.getElementById('step1Status');
  const step2Status = document.getElementById('step2Status');
  const step3Status = document.getElementById('step3Status');
  const progressBar = document.getElementById('progressBar');
  const taskResult = document.getElementById('taskResult');
  const generateBtn = document.getElementById('generateBtn');
  const generateBtnText = document.getElementById('generateBtnText');
  const hwidInfo = document.getElementById('hwidInfo');
  const keyResult = document.getElementById('keyResult');
  const countdownElement = document.getElementById('countdown');

  const urlParams = new URLSearchParams(window.location.search);
  verificationToken = urlParams.get('verification');

  if (verificationToken) {
    verifyTaskCompletion(verificationToken);
  }

  function updateCountdown() {
    const now = new Date();
    const minutesLeft = 59 - now.getMinutes();
    const secondsLeft = 59 - now.getSeconds();
    
    const formattedTime = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
    countdownElement.textContent = formattedTime;
  }

  function verifyTaskCompletion(token) {
    updateProgressUI(1);
    setTimeout(() => {
      const isValid = validateVerificationToken(token);
      
      if (isValid) {
        taskCompleted = true;
        updateProgressUI(3);
        
        setTimeout(() => {
          redirectCard.style.display = 'none';
          keyCard.style.display = 'block';
          detectHardwareID();
        }, 1000);
      } else {
        updateProgressUI(1);
        
        taskResult.className = 'result error';
        taskResult.style.display = 'block';
        taskResult.textContent = 'Verification failed. The token is invalid or expired. Please try again.';
      }
    }, 2000);
  }

  function validateVerificationToken(token) {
    if (token && token.length >= 20 && token.startsWith('VERIFY-')) {
      return true;
    }
    
    if (token === 'demo') {
      return true;
    }
    
    return false;
  }

  function updateProgressUI(step) {
    if (step >= 1) {
      step1Status.innerHTML = '<div class="indicator completed"></div><span>Completed</span>';
      progressBar.style.width = '33%';
    }
    
    if (step >= 2) {
      step2Status.innerHTML = '<div class="indicator completed"></div><span>Completed</span>';
      progressBar.style.width = '66%';
    }
    
    if (step >= 3) {
      step3Status.innerHTML = '<div class="indicator completed"></div><span>Completed</span>';
      progressBar.style.width = '100%';
      
      taskResult.className = 'result success';
      taskResult.style.display = 'block';
      taskResult.textContent = 'Task verification completed successfully! You can now generate your key.';
    }
  }

  function detectHardwareID() {
    hwidInfo.textContent = "Detecting your hardware...";
    
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        let components = [];
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(navigator.hardwareConcurrency);
        components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);
        
        if (gl) {
          components.push(gl.getParameter(gl.VENDOR));
          components.push(gl.getParameter(gl.RENDERER));
        }
        
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        if (verificationToken) {
          components.push(verificationToken);
        }
        
        const hwid = generateHwidFromComponents(components);
        currentHwid = `HWID-${hwid.substring(0, 4)}-${hwid.substring(4, 8)}-${hwid.substring(8, 12)}-${hwid.substring(12, 16)}`;
        
        hwidInfo.textContent = currentHwid;
        generateBtn.disabled = false;
        
      } catch (error) {
        hwidInfo.textContent = "Error detecting hardware ID";
        console.error(error);
      }
    }, 1500);
  }

  function generateHwidFromComponents(components) {
    const componentString = components.join('|');
    
    function simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
    
    const hash1 = simpleHash(componentString);
    const hash2 = simpleHash(componentString.split('').reverse().join(''));
    
    return (hash1 + hash2).substring(0, 16).toUpperCase();
  }

  function generateKey() {
    if (!currentHwid) {
      keyResult.className = 'result error';
      keyResult.style.display = 'block';
      keyResult.textContent = 'Unable to detect your hardware ID. Please refresh the page.';
      return;
    }
    
    if (!taskCompleted && !verificationToken) {
      keyResult.className = 'result error';
      keyResult.style.display = 'block';
      keyResult.textContent = 'You must complete the verification task first.';
      return;
    }
    
    generateBtn.disabled = true;
    generateBtnText.innerHTML = '<span class="loading"></span>Generating...';
    
    setTimeout(() => {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        
        function simpleHash(str) {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash).toString(16);
        }
        
        const hwidHash = simpleHash(currentHwid);
        const timeSalt = simpleHash(`${currentDay}${currentMonth}${currentHour}`);
        
        const antiBypass = simpleHash(hwidHash + timeSalt + verificationToken);
        const key = `LL-${hwidHash.substring(0, 6)}-${timeSalt.substring(0, 6)}-${antiBypass.substring(0, 8)}`;
        
        const rawLink = `lootlink://auth/${key}/${currentHwid}/${Math.floor(now.getTime() / 1000)}`;
        
        keyResult.className = 'result success';
        keyResult.style.display = 'block';
        keyResult.innerHTML = `
          <strong>Your Key:</strong> ${key}
          <p>This key will reset at the top of the next hour.</p>
          <div>
            <strong>Raw Link:</strong>
            <code class="raw-link">${rawLink}</code>
          </div>
        `;
        
        generateBtn.disabled = false;
        generateBtnText.textContent = 'Regenerate Key';
        
      } catch (error) {
        keyResult.className = 'result error';
        keyResult.style.display = 'block';
        keyResult.textContent = 'An error occurred while generating your key. Please try again.';
        console.error(error);
        
        generateBtn.disabled = false;
        generateBtnText.textContent = 'Generate Key';
      }
    }, 2000);
  }
  
  generateBtn.addEventListener('click', generateKey);
  
  updateCountdown();
  setInterval(updateCountdown, 1000);
});

function redirectToTask() {
    const step1Status = document.getElementById('step1Status');
    step1Status.innerHTML = '<div class="indicator completed"></div><span>Completed</span>';
  
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '33%';
  
    const redirectBtn = document.getElementById('redirectBtn');
    redirectBtn.innerHTML = '<span class="loading"></span>Redirecting...';
    redirectBtn.disabled = true;
  
    setTimeout(() => {
      localStorage.setItem('taskStarted', 'true');
      localStorage.setItem('taskStartTime', Date.now());
      window.open(TASK_URL, '_blank');
    }, 1500);
  }