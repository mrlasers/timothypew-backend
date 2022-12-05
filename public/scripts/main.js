document.querySelectorAll(".toggle").forEach((toggle) =>
  toggle.addEventListener("click", (e) => {
    e.currentTarget?.parentElement.classList.toggle("active")
  })
)

// focus first form input
document.querySelector("form input, form textarea")?.focus()
