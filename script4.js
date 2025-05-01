let subtitles = [];
let video = document.getElementById('video');
let subtitleDisplay = document.getElementById('subtitleDisplay');
let vclose = document.querySelector('.v-close');
let srtfname = document.querySelector('.srtName');

function chooseVideo() {
    Swal.fire({
        title: 'Choose Video Source',
        html: `<button onclick='selectLocalVideo()' class='swal2-confirm'>Local File</button>
               <button onclick='enterVideoURL()' class='swal2-confirm'>URL</button>`
    });
}

function selectSrt() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = event => {
        const file = event.target.files[0];
        if (!file) {
          console.error('No file selected');
          return;
        }
        srtfname.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
           subtitles = parseSRT(e.target.result);
           console.log(`${subtitles}`);
           renderSubtitles();
        };
        reader.readAsText(file);
        event.target.value='';   
    };
    input.click();
}

function selectLocalVideo() {
    Swal.close();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = event => {
        const file = event.target.files[0];
        const url = URL.createObjectURL(file);
        video.src = url;
    };
    input.click();
}

function playM3u8(videoSrc,poster) {
   video.poster=poster;
   if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
          //video.play();
          updatePlayPauseIcon();
          togglePlayer();
      });
   } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function () {
          //video.play()
          updatePlayPauseIcon();
          togglePlayer();
      });
   }else{
      log("cant play!")
   }
}

function enterVideoURL() {
    Swal.fire({
        title: 'Enter Video URL',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Load'
    }).then((result) => {
        if (result.isConfirmed) {
            if (result.value.includes("m3u8")==true){
               playM3u8(result.value,"")
            }else{
               video.src = result.value;
            }
        }
    });
}
/*
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        subtitles = parseSRT(e.target.result);
        renderSubtitles();
    };
    reader.readAsText(file);
});
*/

document.getElementById('fileInput').addEventListener('change', function(event) {
    console.log('File input changed');
    const file = event.target.files[0];
    if (!file) {
        console.error('No file selected');
        return;
    }
    srtfname.textContent = file.name;
    console.log('File selected:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('FileReader loaded');
        console.log('File content:', e.target.result.substring(0, 100)); // Show first 100 characters
        subtitles = parseSRT(e.target.result);
        console.log('Subtitles parsed:', subtitles);
        renderSubtitles();
    };
    reader.onerror = function(err) {
        console.error('FileReader error:', err);
    };
    reader.readAsText(file);
});

function parseSRT(srtText) {
    const blocks = srtText.trim().split(/\r?\n\r?\n/);
    const subtitleData = [];

    for (const block of blocks) {
        const lines = block.trim().split(/\r?\n/);
        if (lines.length >= 3) {
            const id = parseInt(lines[0]);
            const time = lines[1];
            const text = lines.slice(2).join(" ").trim();
            subtitleData.push({ id, time, text });
        } else if (lines.length === 2) {
            const id = parseInt(lines[0]);
            const time = lines[1];
            subtitleData.push({ id, time, text: "" });
        }
    }

    return subtitleData;
}



function renderSubtitles() {
    const container = document.getElementById('editorContainer');
    container.innerHTML = "";
    subtitles.forEach((sub, i) => {
        const btn = document.createElement('button');
        btn.className = 'subtitle-button';
        btn.textContent = `${sub.text}`;
        btn.onclick = () => editSubtitleN(i);
        btn.dataset.index = i;
        //const removeBtn = document.createElement('button');
       // removeBtn.className = 'subtitle-button remove';
        //removeBtn.textContent = 'Remove';
       // removeBtn.onclick = () => removeSubtitle(i);
        container.appendChild(btn);
    });
    video.addEventListener('timeupdate', highlightSubtitle);
}

function replaceFromAll(patternStr, replacement, flags = 'g') {
    try {
        const regex = new RegExp(patternStr, flags);
        subtitles.forEach((sub, i) => {
            sub.text = sub.text.replace(regex, replacement);
        });
        renderSubtitles();
    } catch (err) {
        console.error("Invalid regex:", err.message);
        Swal.fire("Invalid Regex", err.message, "error");
    }
}

async function promptRegexReplace() {
  const { value: formValues } = await Swal.fire({
    title: 'Regex Replace',
    html:
      `<input id="patternInput" class="swal2-input" placeholder="Regex pattern (e.g., hello|hi)">` +
      `<input id="replacementInput" class="swal2-input" placeholder="Replacement text">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Replace',
    preConfirm: () => {
      const pattern = document.getElementById('patternInput').value.trim();
      const replacement = document.getElementById('replacementInput').value;
      if (!pattern) {
        Swal.showValidationMessage('Pattern is required');
        return false;
      }
      return { pattern, replacement };
    }
  });

  if (formValues) {
    replaceFromAll(formValues.pattern, formValues.replacement);
    Swal.fire('Done!', 'Replacement applied.', 'success');
  }
  
}


nsubf=0;
function highlightSubtitle() {
    let currentTime = video.currentTime;
    document.querySelectorAll('.subtitle-button').forEach(btn => btn.classList.remove('active'));
    subtitles.forEach((sub, i) => {
        let times = sub.time.split(' --> ');
        let start = convertToSeconds(times[0]);
        let end = convertToSeconds(times[1]);
        subtitleDisplay = document.getElementById('subtitleDisplay');
        if (currentTime >= start && currentTime <= end) {
            document.querySelectorAll('.subtitle-button')[i].classList.add('active');
            if(sub.text){
               //subtitleDisplay.textContent = sub.text;
               subtitleDisplay.innerHTML = sub.text;
            }else{
               subtitleDisplay.textContent = ""
            }
            nsubf=i;
            console.log(start,end,"-",sub.text);
            //subtitleDisplay.ondblclick 
        }else if(currentTime >=end && currentTime >=start){
            subtitleDisplay.textContent = ""
        }
    });
}

function convertToSeconds(timeString) {
    let parts = timeString.split(':');
    let seconds = parseFloat(parts[2].replace(',', '.'));
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + seconds;
}

async function editSubtitleN(index) {
    if(!index){
        swal.fire("Err","No index","error");
        return;
    }
    await Swal.fire({
        title: 'Edit Subtitle',
        html: `<div style='width:100%'>
               <input id='timeInput' class='swal2-input' value='${subtitles[index].time}' oninput="formatTimeInput(this)">
               <textarea id='textInput' class='swal2-textarea' style='max-height: 100px;'>${subtitles[index].text}</textarea>
               <button onclick='translateText(${index})' class='swal2-confirm'>Translate</button>
               <button onclick='removeSubtitle(${index},this)' class='swal2-confirm' style='background:red;color:white;'>RemoveLine</button>
               </div>`,
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: () => {
            subtitles[index].time = document.getElementById('timeInput').value;
            subtitles[index].text = document.getElementById('textInput').value;
            renderSubtitles();
            highlightSubtitle();
        }
    });
}

async function editSubtitle(index) {
    if(!video.paused){
        video.pause();
    }
    if(!index){
        index=nsubf;
    }
    await Swal.fire({
        title: 'Edit Subtitle',
        html: `<div style='width:100%'>
               <input id='timeInput' class='swal2-input' value='${subtitles[index].time}' oninput="formatTimeInput(this)">
               <textarea id='textInput' class='swal2-textarea' style='max-height: 100px;'>${subtitles[index].text}</textarea>
               <button onclick='translateText(${index})' class='swal2-confirm'>Translate</button>
               <button onclick='removeSubtitle(${index},this)' class='swal2-confirm' style='background:red;color:white;'>RemoveLine</button>
               </div>`,
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: () => {
            subtitles[index].time = document.getElementById('timeInput').value;
            subtitles[index].text = document.getElementById('textInput').value;
            renderSubtitles();
            highlightSubtitle();
        }
    });
    if(video.paused){
        video.play();
    }
}

function formatSrtTime(seconds) {
  const ms = Math.floor((seconds % 1) * 1000);
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function getSrtTimeRange(currentTime, duration = 5) {
  const start = formatSrtTime(currentTime);
  const end = formatSrtTime(currentTime + duration);
  return `${start} --> ${end}`;
}

async function addSubtitle() {
    if(!video.paused){
        video.pause();
    }
    await Swal.fire({
        title: 'Add Subtitle',
        html: `<input id='newTimeInput' class='swal2-input' placeholder='00:00:00,000 --> 00:00:00,000' oninput="formatTimeInput(this)">
               <textarea id='newTextInput' class='swal2-textarea' placeholder='Subtitle Text'></textarea>`,
        showCancelButton: true,
        confirmButtonText: 'Add',
        didOpen: ()=>{
            nti=document.getElementById('newTimeInput');
            if(nti){
                nti.value=getSrtTimeRange(video.currentTime,5);
            }
        },
        preConfirm: () => {
            const newTime = document.getElementById('newTimeInput').value;
            const newText = document.getElementById('newTextInput').value;
            if (newTime && newText) {
                subtitles.push({ time: newTime, text: newText });
                subtitles.sort((a, b) => convertToSeconds(a.time.split(' --> ')[0]) - convertToSeconds(b.time.split(' --> ')[0]));
                renderSubtitles();
            }
        }
    }); 
    if(video.paused){
        video.play();
    }
}

function removeSubtitle(index,el) {
    subtitles.splice(index, 1);
    renderSubtitles();
    el.disabled=true;
    el.textContent="✅️"
}

function formatTimeInput(input) {
    
}

function translateText(index) {
    Swal.fire({
        title: 'Translate Text',
        input: 'text',
        inputPlaceholder: 'Enter translated text',
        showCancelButton: true,
        confirmButtonText: 'Translate',
        preConfirm: (translatedText) => {
            subtitles[index].text = translatedText;
            renderSubtitles();
        }
    });
}

function downloadSRT() {
    Swal.fire({
        title: 'Enter New File Name',
        input: 'text',
        inputPlaceholder: 'New SRT File Name',
        showCancelButton: true,
        confirmButtonText: 'Download',
        preConfirm: (fileName) => {
            if (fileName) {
                const srtContent = generateSRT();
                const blob = new Blob([srtContent], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}.srt`;
                link.click();
            }
        }
    });
}

function generateSRT() {
    let srtContent = "";
    subtitles.forEach((sub, index) => {
        const time = sub.time;//.replace(' --> ', '\n');
        srtContent += `${index + 1}\n${time}\n${sub.text}\n\n`;
    });
    return srtContent;
}

async function translateFetch(array) {
  const res = await fetch('https://script.google.com/macros/s/AKfycbzIGSaqAW3bMXGy2OmkxUE7naK9655AuHl8E0dylXoFLlSR9Wh-6m38NTy-HH8lWxgrmw/exec', {
    method: 'POST',
    body: JSON.stringify({ array }),
    //headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log(JSON.stringify(data,null,2));
  return data.translated;
}

api='https://script.google.com/macros/s/AKfycbxy6sC9wk27K-VKm4VBZCr-ynW3Yvhsi0h7irb6JTYdxxmB0DSrgqqFDOuXHcFAFTqtbQ/exec';
async function translateAll(elm) {
    elm.textContent="Translating!...";
    ar=[];
    for(el of subtitles){
        ar.push(el.text);
    }
    x=await translateFetch(ar);
    subtitles.forEach((el,i)=>{
        subtitles[i].text = x[i];
    })
    renderSubtitles();
    elm.textContent="Translated!";
    elm.disbled="true";
}

const customDiv = document.querySelector('.video-h');

document.addEventListener('fullscreenchange', () => {
  const fsElement = document.fullscreenElement;

  if (fsElement === video) {
    // Exit fullscreen on video
    document.exitFullscreen().then(() => {
      // Show your custom div and make it fullscreen
      
    });
  }
});

function fulls() {
    if (customDiv.classList.contains('full-screen')) {
        vclose.classList.add('hide');
        customDiv.classList.remove('full-screen');
        customDiv.classList.add('n-screen');
    
    }else{
    vclose.classList.remove('hide');
    customDiv.classList.remove('n-screen');
    customDiv.classList.add('full-screen');
    }
}
