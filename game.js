const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 900;
canvas.height = 675;


const waveTextureImage = new Image();
waveTextureImage.src = "images/waveTexture.png"; // yalnızca üstte görünen hareketli dalga deseni
const background1 = new Image();
background1.src = "images/background.png";
const background2 = new Image();
background2.src = "images/background2.png";
const hookImage = new Image();
hookImage.src = "assets/hook.png";
const catchTolerance = 10;  // ne kadar genişlik eklensin, piksel cinsinden
const crabImage = new Image();
crabImage.src = "assets/crab.png";
let currentBackground = background1;
let score = 0;
let level = 0;
let timeLeft = 120;
let gameInterval, timerInterval;
let spawnInterval;
let hookCount = 30; // Oyuncunun hakkı (30 kanca atma hakkı)
let lastCaughtColor = null;       // Son yakalanan nesnenin rengi
let comboCount = 0;               // Aynı renkten kaç tane yakalandı üst üste
let lastCatchTime = 0;            // Son yakalamadan geçen süre (ms)
let bonusComboPoints = 200;        // Combo bonus puan
let lastCaughtComboKey = null;
let fastCatchBonusPoints = 10;    // Hızlı yakalama bonusu için
let catchSpeedThreshold = 2000;   // 2 saniye içinde hızlı yakalamayı sayacağız
let caughtObject = null;
let crab = {
  name: "Ferris Crab",
  value: 10000,
  image: "crab.png",
  x: -100,
  y: 600,
  width: 80,
  height: 60,
  visible: false,
  direction: 1,
  speed: 0.5,
  alpha: 0.3,
  fadeIn: true,
  spawnTriggered: false,
  caught: false
};
let levelGlow = false;            // Seviye atlama ışıldama durumu
let glowDuration = 3000;          // 3 saniye ışıldama sürsün

let scorePopups = [];
let proofCount = 0;
let finalScore = 0;
let waveOffsetX = 0;
const waveSpeed = 0.5; // Daha yavaş veya hızlı yapabilirsin
let previousProofCount = 0;
let previousScore = 0;
let previousLevel = 0;
let hookSpeedBoostActive = false;
let hookSpeedBoostEndTime = 0;
let gameStarted = false;
let gameStartTime = 0;
 const hook = {
   angle: 0,
   radius: 150,
   x: canvas.width / 2,
   y: 40,
   originX: canvas.width / 2,
   originY: 100,    // ← Burayı background’daki halatın başladığı Y koordinatına getir
   width: 4,
   height: 20,
   swinging: true,
   dropping: false,
   returning: false,
   holding: null,
   speed: 8,
   baseSwingSpeed: 0.010,
   swingSpeed: 0.010,
 };


const items = [
  // 🎩 Şapkalar
  { name: "Blue Hat", value: 50, image: "blue_hat.png", color: "blue", comboKey: "blue", lifetime: 10, weight: 4 },
  { name: "Yellow Hat", value: 50, image: "yellow_hat.png", color: "yellow", comboKey: "yellow", lifetime: 10, weight: 4 },
  { name: "Red Hat", value: 50, image: "red_hat.png", color: "red", comboKey: "red", lifetime: 10, weight: 4 },
  { name: "Purple Hat", value: 50, image: "purple_hat.png", color: "purple", comboKey: "purple", lifetime: 10, weight: 4 },

  // 💻 GPU'lar
  { name: "GPU_Blue", value: 100, image: "gpu_blue.png", color: "blue", comboKey: "blue", lifetime: 12, weight: 3 },
  { name: "GPU_Green", value: 100, image: "gpu_green.png", color: "green", comboKey: "green", lifetime: 12, weight: 3 },
  { name: "GPU_Orange", value: 100, image: "gpu_orange.png", color: "orange", comboKey: "orange", lifetime: 12, weight: 3 },
  { name: "GPU_Purple", value: 100, image: "gpu_purple.png", color: "purple", comboKey: "purple", lifetime: 12, weight: 3 },
  { name: "GPU_Pink", value: 100, image: "gpu_pink.png", color: "pink", comboKey: "pink", lifetime: 12, weight: 3 },

  // 🗑️ Çöpler (tek comboKey "trash")
  { name: "Trash_0", value: +5, image: "Trash_0.png", color: "gray", comboKey: "trash", lifetime: 10, weight: 4 },
  { name: "Trash_1", value: +5, image: "Trash_1.png", color: "gray", comboKey: "trash", lifetime: 10, weight: 4 },
  { name: "Trash_2", value: +5, image: "Trash_2.png", color: "black", comboKey: "trash", lifetime: 10, weight: 4 },
  { name: "Trash_3", value: +5, image: "Trash_3.png", color: "black", comboKey: "trash", lifetime: 10, weight: 4 },
  { name: "Trash_4", value: +5, image: "Trash_4.png", color: "black", comboKey: "trash", lifetime: 10, weight: 4 },
  // 🧠 Özel item (combo yok)
  { name: "SP1 Box", value: 1000, image: "sp1_box.png", color: "pink", comboKey: null, lifetime: 15, weight: 5, spawnAfter: 10 }
];

const itemImages = {};

items.forEach(item => {
  const img = new Image();
  img.src = `/assets/${item.image}`;
  itemImages[item.name] = img;
});

let objects = [];

function spawnItem(timeLeft) {
  // Başlangıçtan itibaren geçen süre (saniye)
  const timePassed = (Date.now() - gameStartTime) / 1000;

  const weightedItems = [];

  items.forEach(item => {
    // SP1 Box’ın ilk 10 saniyede çıkmaması:
    if (item.name === "SP1 Box" && timePassed < 10) return;

    // Eğer başka bir spawnAfter tanımı varsa kontrol et:
    const spawnAfter = item.spawnAfter ?? 0;
    if (timePassed < spawnAfter) return;

    // Ağırlık kadar listeye ekle
    const weight = item.weight || 1;
    for (let i = 0; i < weight * 10; i++) {
      weightedItems.push(item);
    }
  });

  if (weightedItems.length === 0) return;

  const selectedItem = weightedItems[
    Math.floor(Math.random() * weightedItems.length)
  ];

  const x = Math.random() * (canvas.width - 40);
  const y = 380 + Math.random() * 160;
  if (objects.some(o => Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < 40))
    return;

  objects.push({
    ...selectedItem,
    x,
    y,
    width: 40,
    height: 30,
    spawnTime: Date.now(),
    floatOffset: Math.random() * Math.PI * 2,
    floatSpeed: 0.5 + Math.random() * 0.5,
    bubbles: [],
    originalImage: selectedItem.image,
    originalName: selectedItem.name,
    originalValue: selectedItem.value,
    originalColor: selectedItem.color,
    isTransformed: false
  });
}

function createBubble(obj) {
  if (obj.bubbles.length > 10) return; // çok fazla olmasın

  obj.bubbles.push({
    x: obj.x + obj.width / 2 + (Math.random() * 10 - 5),
    y: obj.y + obj.height,
    radius: 2 + Math.random() * 2,
    speed: 0.5 + Math.random() * 0.5,
    alpha: 1,
    lifetime: 60
  });
}


function drawBackground() {
  if (currentBackground.complete) {
    ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);
 }
  // ----------------------------

  if (waveTextureImage.complete) {
    // Kaydırılmış dalga efekti için
    waveOffsetX -= waveSpeed;

    // Görselin sonsuz döngüyle akması için modulo kullanıyoruz
    const waveWidth = waveTextureImage.width;

    // İki kez çiziyoruz, böylece bir tanesi ekran dışına çıkınca diğeri onun yerini alır
    const waveY = 150;
    ctx.drawImage(waveTextureImage, waveOffsetX, waveY, waveWidth, waveTextureImage.height);
    ctx.drawImage(waveTextureImage, waveOffsetX + waveWidth, waveY, waveWidth, waveTextureImage.height);

    // Eğer birinci görsel tamamen ekran dışına çıktıysa sıfırla
    if (waveOffsetX <= -waveWidth) {
      waveOffsetX = 0;
    }
  }
}

function drawHook() {
  // Pivot olarak hook.originX, hook.originY kullanılıyor
  ctx.beginPath();
  ctx.moveTo(hook.originX, hook.originY);
  ctx.lineTo(hook.x, hook.y);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Kanca çizimi
  if (hookImage.complete) {
    ctx.drawImage(hookImage, hook.x - 15, hook.y, 30, 30);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(hook.x - 10, hook.y, 20, hook.height);
  }

  // Sadece "Ferris Crab" tutuluyorsa onu çiz
  if (hook.holding && hook.holding.name === "Ferris Crab") {
    ctx.drawImage(
      crabImage,
      hook.holding.x,
      hook.holding.y,
      hook.holding.width,
      hook.holding.height
    );
  }
}



function updateHook() {
  // Hız boost süresi kontrolü
  if (hookSpeedBoostActive && Date.now() > hookSpeedBoostEndTime) {
    hookSpeedBoostActive = false;
    hook.swingSpeed = hook.baseSwingSpeed * Math.sign(hook.swingSpeed);
  }

  const swingAngle = Math.PI / 3;
  const t = Date.now() / 500;
  const speedMultiplier = hookSpeedBoostActive ? 2 : 1; // %100 artış için

  if (hook.swinging) {
    hook.angle += hook.swingSpeed;
    if (hook.angle > swingAngle) hook.swingSpeed = -Math.abs(hook.swingSpeed);
    if (hook.angle < -swingAngle) hook.swingSpeed = Math.abs(hook.swingSpeed);

    hook.x = hook.originX + Math.sin(hook.angle) * hook.radius;
    hook.y = hook.originY + Math.cos(hook.angle) * hook.radius;
  }

  if (hook.dropping) {
    // Düşme hareketi
    hook.x += hook.dx * hook.speed * speedMultiplier;
    hook.y += hook.dy * hook.speed * speedMultiplier;

    for (let obj of objects) {
if (
  hook.x > obj.x - catchTolerance &&
  hook.x < obj.x + obj.width + catchTolerance &&
  hook.y > obj.y - catchTolerance &&
  hook.y < obj.y + obj.height + catchTolerance
) {
        hook.holding = obj;
        caughtObject = obj;
        hook.dropping = false;
        hook.returning = true;
        hook.speed = 3;
      }
    }

    if (hook.y > canvas.height || hook.x < 0 || hook.x > canvas.width) {
      hook.dropping = false;
      hook.returning = true;
      hook.speed = 6;
    }
  }

  if (hook.returning) {
    const dx = hook.originX - hook.x;
    const dy = hook.originY - hook.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (hook.holding) {
      hook.holding.x = hook.x - 15;
      hook.holding.y = hook.y + 20;
    }
if (crab.caught) {
  crab.x = hook.x - 25;
  crab.y = hook.y + 10;
}
    if (dist < 10) {
      hook.returning = false;
      hook.swinging = true;
      hook.speed = 8;

      if (hook.holding) {
        const now = Date.now();

if (
  hook.holding.comboKey &&
  hook.holding.comboKey === lastCaughtComboKey
) {
  comboCount++;
} else {
  comboCount = 0;
}
lastCaughtComboKey = hook.holding.comboKey;

        if (comboCount >= 1) {
          score += bonusComboPoints;
          comboCount = 0;
          showScorePopup(`Combo +${bonusComboPoints}`, 90, 110 + 20, "gold");
        }

        // SP1 Box özel ödüller
if (hook.holding.name === "SP1 Box") {
  // 1) Puan, hak ve zamanı ekle
  score     += 1000;
  hookCount += 5;
  timeLeft  += 15;

  // 2) Eğer boost daha önce aktif değilse, hızı 2× yap; değilse yalnızca süresini yenile
  if (!hookSpeedBoostActive) {
    hook.swingSpeed = hook.baseSwingSpeed * 2;
    hookSpeedBoostActive = true;
  }
  hookSpeedBoostEndTime = now + 10000;  // her SP1 yakalayışta 10 sn daha ekle

  // 3) Gösterimler
  showScorePopup("SP1 CUBE BONUS! +1000", hook.x, hook.y + 40, "#c2185b");
  showScorePopup("+5 Hooks",     hook.x, hook.y + 60, "#ff4081");
  showScorePopup("+15s Time",    hook.x, hook.y + 80, "#ff79a7");
  showScorePopup("Speed!",       hook.x, hook.y + 100, "#ff79a7");
}

        // Normal skor ekleme
        score += hook.holding.value;
        showScorePopup(
          `${hook.holding.value > 0 ? "+" : ""}${hook.holding.value}`,
          hook.x,
          hook.y + 20,
          hook.holding.value > 0 ? "gold" : "red"
        );
if (hook.holding.name === "Ferris Crab") {
  showScorePopup("FERRIS CRAB!", hook.x, hook.y + 40, "magenta");
  transformTrashTemporarily(); // ← çöpleri geçici olarak değiştir
  startConfetti();             // ← konfeti efekti başlat
}
        // Ceza ve kanca ödülü
        if (hook.holding.name.startsWith("Trash")) {
          hookCount = Math.max(0, hookCount - 1);
          showScorePopup(`TRASH !`, hook.x, hook.y - 40, "red");
          showScorePopup(`-1 Hook`, hook.x, hook.y - 20, "red");
        }

        // Proof sistemi
        const isNotTrash = !hook.holding.name.startsWith("Trash");
        const isProofItem =
          ["SP1 Box", "Blue Hat", "Yellow Hat", "Red Hat", "Purple Hat"].includes(
            hook.holding.name
          ) || hook.holding.name.startsWith("GPU");
        if (isNotTrash && isProofItem) {
          proofCount++;
	updateLevelFromProof();
          showScorePopup(`PROOF !`, 70, 90, "#c2185b");
        }

        objects = objects.filter(o => o !== hook.holding);
        lastCatchTime = now;
        lastCaughtColor = hook.holding.color;
       if (hook.holding === crab && crab.caught) {
         currentBackground = background2;
       }
        hook.holding = null;
      }
    } else {
      hook.dx = dx / dist;
      hook.dy = dy / dist;

      let returnSpeed = hook.speed * speedMultiplier;
      if (hook.holding) {
        if (hook.holding.name.startsWith("Trash")) {
          returnSpeed *= 0.8;
        } else if (hook.holding.name === "SP1 Box") {
          returnSpeed *= 1.2;
        }
      }
      hook.x += hook.dx * returnSpeed;
      hook.y += hook.dy * returnSpeed;
    }
  }
}

function transformTrashTemporarily() {
  objects.forEach(obj => {
    if (obj.name.startsWith("Trash") && !obj.isTransformed) {
obj.originalImage = obj.image;
obj.originalName = obj.name;
obj.originalValue = obj.value;
obj.originalColor = obj.color;

obj.image = "sp1_box.png";
obj.name = "SP1 Box"; // Gerçek gibi davranacak
obj.value = 1000;
obj.color = "pink";
obj.isTransformed = true;
    }
  });

setTimeout(() => {
  objects.forEach(obj => {
    if (obj.isTransformed) {
      obj.image = obj.originalImage;
      obj.name = obj.originalName;
      obj.value = obj.originalValue;
      obj.color = obj.originalColor;
      obj.isTransformed = false;
    }
  });
}, 15000); // 5 saniye sonra geri dön


}
let confettiParticles = [];

function startConfetti() {
  for (let i = 0; i < 100; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: (Math.random() - 0.5) * 2,
      dy: Math.random() * -2 - 1,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`,
      size: 5 + Math.random() * 5,
      alpha: 1
    });
  }

  setTimeout(() => {
    confettiParticles = [];
  }, 3000);
}

function drawConfetti() {
  confettiParticles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    p.x += p.dx;
    p.y += p.dy;
    p.alpha -= 0.01;
  });

  confettiParticles = confettiParticles.filter(p => p.alpha > 0);
}
function updateObjects() {
  const now = Date.now();

  for (let i = objects.length - 1; i >= 0; i--) {
    let obj = objects[i];

    // Eğer nesne tutuluyorsa → baloncukları yok et ve çekme efekti uygula
    if (hook.holding === obj || caughtObject === obj) {
      obj.bubbles = []; // 🎈 Baloncukları sil

      // ⬆️ Yukarı çekme efekti
      obj.y -= 1.2;

      // 🔍 Küçülerek yukarı çekiliyormuş gibi görünmesi
      obj.width *= 0.995;
      obj.height *= 0.995;


      continue; // Baloncuk güncellenmeden çık
    }

    const age = (now - obj.spawnTime) / 1000;
    if (age > obj.lifetime) {
      objects.splice(i, 1);
      continue;
    }

    // 🪼 Hafif yukarı-aşağı salınım
    obj.floatOffset += obj.floatSpeed * 0.02;
    obj.y += Math.sin(obj.floatOffset) * 0.3;

    // 🎈 Baloncuk oluştur (rastgele)
    if (Math.random() < 0.03) {
      if (!obj.bubbles) obj.bubbles = []; // baloncuk dizisi yoksa oluştur
      obj.bubbles.push({
        x: obj.x + obj.width / 2 + (Math.random() * 10 - 5),
        y: obj.y,
        radius: 2 + Math.random() * 2,
        opacity: 1
      });
    }

    // 🎈 Baloncukları güncelle
    if (obj.bubbles) {
      obj.bubbles = obj.bubbles.filter(b => b.opacity > 0);
      for (let bubble of obj.bubbles) {
        bubble.y -= 0.5;
        bubble.opacity -= 0.01;
      }
    }
  }
}


function drawObjects() {
  for (let obj of objects) {
    const img = itemImages[obj.name] || itemImages["SP1 Box"];
    if (img && img.complete) {
      ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
    } else {
      ctx.fillStyle = obj.color || "gray";
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    }
if (
  crab.visible &&
  !crab.caught &&
  hook.x > crab.x - 10 &&
  hook.x < crab.x + crab.width + 10 &&
  hook.y > crab.y - 10 &&
  hook.y < crab.y + crab.height + 10
) {
  hook.holding = crab;
  caughtObject = crab;
  crab.caught = true;
  crab.visible = false;
  hook.dropping = false;
  hook.returning = true;
  hook.speed = 3;
}
    // 🎈 Baloncukları çiz
    if (obj.bubbles) {
      for (let bubble of obj.bubbles) {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(173, 216, 230, ${bubble.opacity})`; // Açık mavi, saydam
        ctx.fill();
      }
    }
  }
}

function drawCrab() {
  if (!crab.visible || crab.caught) return;

  ctx.globalAlpha = crab.alpha;
  if (crabImage.complete) {
    ctx.drawImage(crabImage, crab.x, crab.y, crab.width, crab.height);
  } else {
    ctx.fillStyle = "brown";
    ctx.fillRect(crab.x, crab.y, crab.width, crab.height);
  }
  ctx.globalAlpha = 1;

  if (crab.bubbles) {
    for (let bubble of crab.bubbles) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(173, 216, 230, ${bubble.opacity})`;
      ctx.fill();
    }
  }
}
function showScorePopup(text, x, y, color) {
  scorePopups.push({ text, x, y, color, alpha: 0.7, rise: 0 });
}



function draw() {
  drawBackground();      // En altta
  drawObjects();         // Nesneler
  updateHook();          // Oltanın hareketi
  drawUI();              // Skor, zaman, kalan kanca
  drawScorePopups();     // Skor animasyonları (istersen kaldırabilirsin)
  requestAnimationFrame(draw);
}



function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i];
    p.rise += 0.5;
    p.alpha -= 0.006;
    if (p.alpha <= 0) scorePopups.splice(i, 1);
  }
}

function drawScorePopups() {
  for (let p of scorePopups) {
    // 1) Transparanlık
    ctx.globalAlpha = p.alpha;

    // 2) Renk
    ctx.fillStyle = p.color;

    // 3) Font-stil (boyutu 14 → 16px yaptık)
    ctx.font = "bold 18px 'Orbitron', sans-serif";

    // 4) Yazı hizalama
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";

    // 5) Gölge (daha yumuşak, daha belirgin)
    ctx.shadowColor   = "rgba(0, 0, 0, 0.7)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur    = 3;

    // 6) Yazıyı çiz
    ctx.fillText(p.text, p.x, p.y - p.rise);

    // 7) Stroke dış çizgi (daha ince, ama daha koyu ve okunur)
    ctx.lineWidth   = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(p.text, p.x, p.y - p.rise);

    // 8) Stil temizliği
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 1;
  }
}

function updateUI() {
  const scoreElem = document.getElementById("scoreDisplay");
  const levelElem = document.getElementById("levelDisplay");
  const timeElem = document.getElementById("timerDisplay");
  const hookCountElem = document.getElementById("hookCountDisplay");
  const proofCountElem = document.getElementById("proofCountDisplay");

scoreElem.innerHTML = `<strong>Score:</strong> ${score}`;
levelElem.innerHTML = `<strong>Proof Grade:</strong> ${level}×`;
timeElem.innerHTML = `<strong>Time:</strong> ${timeLeft}`;
hookCountElem.innerHTML = `<strong>Hooks Left:</strong> ${hookCount}`;
proofCountElem.innerHTML = `<strong>Proof:</strong> ${proofCount}`;

  // --- 1. ZAMAN GERİ SAYIMI KIRMIZI UYARI ---
  if (timeLeft <= 10) {
    timeElem.style.color = "red";
    timeElem.style.fontWeight = "bold";
  } else {
    timeElem.style.color = "";
    timeElem.style.fontWeight = "";
  }

  // --- 2. KANCA AZALIRSA UYARI ---
  if (hookCount <= 5) {
    hookCountElem.style.color = hookCount <= 2 ? "red" : "orange";
    hookCountElem.style.fontWeight = "bold";
  } else {
    hookCountElem.style.color = "";
    hookCountElem.style.fontWeight = "";
  }

  // --- 3. PROOF SAYISI DEĞİŞTİYSE ANİMASYON ---
  if (proofCount > previousProofCount) {
    proofCountElem.classList.add("proof-flash");
    setTimeout(() => {
      proofCountElem.classList.remove("proof-flash");
    }, 300);
  }
  previousProofCount = proofCount;

  // --- 4. SCORE ARTTIYSA HAFİF PULSE EFEKTİ ---
  if (score > previousScore) {
    scoreElem.classList.add("score-flash");
    setTimeout(() => {
      scoreElem.classList.remove("score-flash");
    }, 300);
  }
  previousScore = score;

  // --- 5. LEVEL ARTTIYSA PARLAMA EFEKTİ ---
  if (level > previousLevel) {
    levelElem.classList.add("level-flash");
    setTimeout(() => {
      levelElem.classList.remove("level-flash");
    }, 400);
  }
  previousLevel = level;

  // --- 6. LEVEL GLOW AKTİFSE RENGİ DEĞİŞTİR ---
  if (levelGlow) {
    levelElem.style.color = `hsl(${(Date.now() / 50) % 360}, 100%, 50%)`;
  } else {
    levelElem.style.color = "";
  }
}


function showGameOver() {
  // Final skoru hesapla (en az 1× olacak şekilde)
  const finalScore = score * Math.max(1, level);

  // Yan paneldeki Proof Grade göstergesini güncelle
  document.getElementById("levelDisplay").textContent = `Proof Grade: ${level}×`;

  // Başlığı ayarla
  document.getElementById("endMessage").textContent = "🎉Proof Delivered!🎉";

  // Final skor kutusunu istediğin formata göre doldur
  document.getElementById("finalScore").innerHTML = `
    <div style="text-align: center;">
      <div>Score:</div>
      <div style="font-weight: bold; font-size: 1.4em; color: #e91e63;">${score}</div>

      <div>Proof Grade:</div>
      <div style="font-weight: bold; font-size: 1.4em; color: #e91e63;">${level}×</div>

      <div style="font-weight: bold; font-size: 2em; color: #e91e63;">=</div>

      <div style="font-weight: 900; font-size: 1.8em; color: #e91e63;">FINAL SCORE</div>
      <div style="font-weight: bold; font-size: 1.6em; color: #4caf50;">${finalScore}</div>
    </div>
  `;

  // Game Over ekranını göster
  document.getElementById("gameOver").style.display = "flex";
}

function startFromButton() {
  document.getElementById("startScreen").style.display = "none";
  gameStarted = true;      // oyun başladı diyoruz
  startGame();
}
function restartGame() {
  // Döngüleri iptal et
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  clearInterval(spawnInterval);

  // 1. Skor ve sayaclar
  score               = 0;
  proofCount          = 0;
  level               = 0;
  timeLeft            = 120;
  hookCount           = 30;

  // 2. Objeler ve efektler
  objects             = [];
  scorePopups         = [];
  confettiParticles   = [];
  caughtObject        = null;

  // 3. Hook reset
  hook.swinging       = true;
  hook.dropping       = false;
  hook.returning      = false;
  hook.holding        = null;
  hook.speed          = 8;
  hook.swingSpeed     = hook.baseSwingSpeed;
  hook.angle          = 0;
  hook.x              = hook.originX;
  hook.y              = hook.originY + hook.radius;

  // 4. Yengeç reset
  crab.visible         = false;
  crab.spawnTriggered  = false;
  crab.caught          = false;
  crab.alpha           = 0.3;
  crab.fadeIn          = true;
  crab.x               = -100;
  crab.y               = 600;
  crab.direction       = 1;
  crab.speed           = 0.5;
  crab.bubbles         = [];

  // 5. Combo & bonus reset
  comboCount           = 0;
  lastCaughtComboKey   = null;
  lastCaughtColor      = null;
  lastCatchTime        = 0;
  hookSpeedBoostActive = false;
  hookSpeedBoostEndTime= 0;

  // 6. Görsel ofsetler
  waveOffsetX          = 0;

  // 7. Arkaplan ve UI
  currentBackground    = background1;
  document.getElementById("gameOver").style.display = "none";

  // 8. Oyunu tekrar başlat
  startGame();
}

function checkCrabSpawn() {
  if (score >= 5000 && !crab.spawnTriggered) {
    crab.visible = true;
    crab.spawnTriggered = true;
    crab.x = Math.random() * (canvas.width - crab.width);
  }
}
function updateCrab() {
  // 1) Yengeç yakalandıysa → yukarı çek ve küçült, sonra çık
  if (crab.caught) {
    crab.y      -= 1.2;     // yukarı doğru kaydır
    crab.width  *= 0.995;   // her karede %0.5 küçült
    crab.height *= 0.995;
    return;
  }

  // 2) Eğer yengeç görünür değilse hiçbir şey yapma
  if (!crab.visible) return;

  // 3) Normal yatay hareket
  crab.x += crab.direction * crab.speed;
  if (crab.x <= 0 || crab.x + crab.width >= canvas.width) {
    crab.direction *= -1;
  }

  // 4) Fade-in / fade-out efekti
  if (crab.fadeIn) {
    crab.alpha += 0.005;
    if (crab.alpha >= 1) crab.fadeIn = false;
  } else {
    crab.alpha -= 0.005;
    if (crab.alpha <= 0.3) crab.fadeIn = true;
  }

  // 5) Kabarcıklar için dizi kontrolü
  if (!crab.bubbles) crab.bubbles = [];

  // 6) Kabarcık spawn
  if (Math.random() < 0.02 && crab.bubbles.length < 10) {
    crab.bubbles.push({
      x: crab.x + crab.width / 2 + (Math.random() * 10 - 5),
      y: crab.y,
      radius: 2 + Math.random() * 2,
      opacity: 1
    });
  }

  // 7) Kabarcıkları güncelle
  crab.bubbles = crab.bubbles.filter(b => b.opacity > 0);
  for (let bubble of crab.bubbles) {
    bubble.y       -= 0.5;
    bubble.opacity -= 0.01;
  }
}

function updateLevelFromProof() {
  if (proofCount < 5) {
    level = 0;
  } else {
    level = Math.min(10, 1 + Math.floor((proofCount - 5) / 10));
  }
}
function startGame() {
 gameStarted = true;
 gameStartTime = Date.now();
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);
  if (spawnInterval) clearInterval(spawnInterval);

  gameInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    updateHook();
    drawHook();
    updateObjects();
    drawObjects();
checkCrabSpawn();
updateCrab();
drawCrab();
updateScorePopups();
drawScorePopups();
updateUI();
drawConfetti();
  }, 1000 / 60);

spawnInterval = setInterval(() => {
  spawnItem(timeLeft);
}, 1500);

timerInterval = setInterval(() => {
  timeLeft--;

  if (timeLeft <= 0 || hookCount <= 0) {
    // 1) timeLeft’i negatiften koruyup 0’a eşitle
    timeLeft = 0;

    // 2) UI’ı hemen güncelle; böylece “Time: 0” gösterilir
    updateUI();

    // 3) Tüm döngüleri durdur
    clearInterval(spawnInterval);
    clearInterval(timerInterval);
    clearInterval(gameInterval);

    // 4) Game Over ekranını aç
    showGameOver();
  }
}, 1000);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    handleDropAction();
  }
});


function handleDropAction() {
  if (!gameStarted) return;

  if (hook.swinging && hookCount > 0) {
    hook.swinging = false;
    hook.dropping = true;

    const dx = hook.x - hook.originX;
    const dy = hook.y - hook.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    hook.dx = dx / dist;
    hook.dy = dy / dist;

    hookCount--;
  }
}
window.onload = () => {
  // Başlangıç ekranı görünsün
  document.getElementById("startScreen").style.display = "flex";
  drawBackground();

  const startBtn = document.getElementById("startButton");
  startBtn.addEventListener("click", () => {
    // Oyun başlatıldığında canvas'a tıklama ve dokunma olaylarını tanımla
    canvas.addEventListener("click", () => {
      handleDropAction();
    });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault(); // Mobilde kaydırmayı engelle
      handleDropAction();
    }, { passive: false });

    // Başlangıç ekranını gizle ve oyunu başlat
    document.getElementById("startScreen").style.display = "none";
    startGame();
  });
};
