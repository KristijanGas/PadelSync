const notificationStyle = document.createElement("style");
notificationStyle.innerHTML = `
.notification-toast {
    position: fixed;
    top: 25px;
    right: 25px;
    background: linear-gradient(135deg, #0e0e0e, #1a1a1a);
    color: #f1f1f1;
    padding: 16px 24px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 500;
    box-shadow:
        0 10px 30px rgba(0,0,0,0.7),
        inset 0 0 0 1px rgba(255,255,255,0.05);
    z-index: 9999;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-20px) scale(0.98);
    animation: toastIn 0.35s ease forwards;
}

.notification-toast::before {
    content: "🔔";
    margin-right: 10px;
}

@keyframes toastIn {
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes toastOut {
    to {
        opacity: 0;
        transform: translateY(-20px) scale(0.96);
    }
}

@media (max-width: 768px) {
    .notification-toast {
        top: auto;
        bottom: 20px;
        right: 50%;
        transform: translateX(50%);
    }
}
`;
document.head.appendChild(notificationStyle);

const socket = io();
const messDiv = document.querySelector(".messages")


socket.on("connect", async () => {
 fetch("/socket/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ socketId: socket.id })
  });
  
});

socket.on("connect_error", (err) => {
  console.error("❌ connect error", err.message);
});


// Listen for notifications
socket.on("notification", () => {
  showNotification("Provjerite inbox za nove poruke");
});

let notificationVisible = false;

// Simple popup example
function showNotification(message) {
  if (notificationVisible) return;
  notificationVisible = true;

  const toast = document.createElement("div");
  toast.className = "notification-toast";
  toast.textContent = message;

  toast.addEventListener("click", () => {
    closeToast(toast);
    window.location.href = "/myInbox";
  });

  document.body.appendChild(toast);

  setTimeout(() => closeToast(toast), 10000);
}

function closeToast(toast) {
  toast.style.animation = "toastOut 0.3s ease forwards";

  setTimeout(() => {
    toast.remove();
    notificationVisible = false;
  }, 300);
}
