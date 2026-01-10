
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
socket.on("notification", (data) => {
  showNotification(data.message);
});

// Simple popup example
function showNotification(message) {
  const div = document.createElement("div");
  div.textContent = message;
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: red;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 9999;
  `;

  div.addEventListener("click", () => {
    div.remove()
    window.location.href = "/myInbox"
  
  });

  document.body.appendChild(div);
}
