const WEBHOOK_URL = "https://kale-patil1006.app.n8n.cloud/webhook/tinyurl";

const form = document.getElementById("urlForm");
const longUrlInput = document.getElementById("longUrl");
const submitBtn = document.getElementById("submitBtn");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const tinyUrlText = document.getElementById("tinyUrlText");
const rawResponse = document.getElementById("rawResponse");
const errorText = document.getElementById("error");

const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");
let particles = [];
let animationId = null;

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startConfetti() {
  const colors = ["#58a6ff", "#7ee787", "#f2cc60", "#ff7b72", "#a5d6ff"];
  particles = Array.from({ length: 160 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.2,
    w: 5 + Math.random() * 7,
    h: 8 + Math.random() * 10,
    color: randomFrom(colors),
    speed: 2 + Math.random() * 4,
    tilt: Math.random() * 8 - 4,
    tiltSpeed: Math.random() * 0.1,
    angle: Math.random() * Math.PI,
    spin: Math.random() * 0.2 - 0.1,
  }));

  const endAt = Date.now() + 1800;

  function draw() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    particles.forEach((p) => {
      p.y += p.speed;
      p.x += Math.sin(p.angle) * 1.5;
      p.angle += p.spin;
      p.tilt += p.tiltSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (Date.now() < endAt) {
      animationId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  draw();
}

function showLoading(isLoading) {
  loading.classList.toggle("hidden", !isLoading);
  submitBtn.disabled = isLoading;
}

function showError(message) {
  errorText.textContent = message;
  errorText.classList.remove("hidden");
}

function clearError() {
  errorText.textContent = "";
  errorText.classList.add("hidden");
}

function showResult(data, rawText) {
  const tinyUrl =
    data?.tinyUrl ||
    data?.shortUrl ||
    data?.url ||
    data?.result ||
    data?.data?.tinyUrl ||
    null;

  if (tinyUrl && /^https?:\/\//i.test(String(tinyUrl))) {
    tinyUrlText.textContent = "Tiny URL: ";
    const link = document.createElement("a");
    link.href = String(tinyUrl);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = String(tinyUrl);
    tinyUrlText.appendChild(link);
  } else {
    tinyUrlText.textContent = "Webhook responded, but no obvious tiny URL key was found.";
  }

  rawResponse.textContent = rawText;
  result.classList.remove("hidden");
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return { parsed: JSON.parse(text), rawText: text };
  } catch {
    return { parsed: { raw: text }, rawText: text };
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  result.classList.add("hidden");

  const longUrl = longUrlInput.value.trim();
  if (!longUrl) {
    showError("Please enter a URL.");
    return;
  }
  try {
    const url = new URL(longUrl);
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error("URL must start with http:// or https://");
    }
  } catch {
    showError("Please enter a valid URL.");
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: longUrl,
        longUrl,
      }),
    });

    const { parsed, rawText } = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Webhook not found (404). If you are using /webhook-test, keep the n8n workflow in test/listening mode, or use the production /webhook URL after activating the workflow."
        );
      }
      throw new Error(parsed?.message || `Request failed with status ${response.status}`);
    }

    showResult(parsed, rawText);
    startConfetti();
  } catch (error) {
    if (error instanceof TypeError) {
      showError(
        "Network/CORS error. Open the site via http://localhost (not file://), and allow CORS in n8n webhook response. Also verify webhook URL is active."
      );
      return;
    }
    showError(error.message || "Something went wrong while contacting the webhook.");
  } finally {
    showLoading(false);
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
