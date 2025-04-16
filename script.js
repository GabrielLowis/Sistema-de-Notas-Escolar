// DOM Elements
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const authForm = document.getElementById("auth-form");
const fileUpload = document.getElementById("file-upload");
const fileName = document.getElementById("file-name");
const uploadBtn = document.getElementById("upload-btn");
const logoutBtn = document.getElementById("logout-btn");
const applyFiltersBtn = document.getElementById("apply-filters");
const yearFilter = document.getElementById("year-filter");
const classFilter = document.getElementById("class-filter");
const subjectFilter = document.getElementById("subject-filter");
const searchInput = document.getElementById("search-input");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const dataTable = document.getElementById("data-table");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");

// Stats elements
const totalStudents = document.getElementById("total-students");
const averageGrade = document.getElementById("average-grade");
const approvalRate = document.getElementById("approval-rate");
const criticalSubject = document.getElementById("critical-subject");

// Charts
let subjectsChart;
let evolutionChart;

// Application State
const state = {
  user: null,
  excelData: null,
  processedData: null,
  filteredData: null,
  years: [],
  classes: [],
  subjects: [],
  currentPage: 1,
  itemsPerPage: 10,
  filters: {
    year: "",
    class: "",
    subject: "",
  },
};

// Demo credentials - In a real application, this would be handled by a server
const credentials = {
  username: "professor",
  password: "sesi2025",
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize login functionality
  authForm.addEventListener("submit", handleLogin);

  // Dashboard functionality
  fileUpload.addEventListener("change", handleFileSelected);
  uploadBtn.addEventListener("click", processExcelFile);
  logoutBtn.addEventListener("click", handleLogout);
  applyFiltersBtn.addEventListener("click", applyFilters);

  // Search and pagination
  searchInput.addEventListener("input", handleSearch);
  prevPageBtn.addEventListener("click", () => changePage(-1));
  nextPageBtn.addEventListener("click", () => changePage(1));

  // Navigation tabs
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll("nav a")
        .forEach((a) => a.classList.remove("active"));
      e.target.classList.add("active");
      // Here you would implement view switching based on data-view attribute
    });
  });

  // Check if user is already logged in (from session storage)
  checkAuthentication();
});

// Authentication Functions
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === credentials.username && password === credentials.password) {
    state.user = { username };
    sessionStorage.setItem("user", JSON.stringify({ username }));
    showDashboard();
    showToast("Login realizado com sucesso!");
  } else {
    showToast("Usuário ou senha incorretos!", "error");
  }
}

function handleLogout() {
  state.user = null;
  sessionStorage.removeItem("user");
  showLoginPage();
  resetState();
  showToast("Logout realizado com sucesso!");
}

function checkAuthentication() {
  const user = sessionStorage.getItem("user");
  if (user) {
    state.user = JSON.parse(user);
    showDashboard();
  }
}

function showLoginPage() {
  dashboardPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

function showDashboard() {
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  document.getElementById("user-name").textContent = state.user.username;
}

// Excel Processing Functions
function handleFileSelected(e) {
  const file = e.target.files[0];
  if (file) {
    fileName.textContent = file.name;
    uploadBtn.disabled = false;
  } else {
    fileName.textContent = "Nenhum arquivo selecionado";
    uploadBtn.disabled = true;
  }
}

function processExcelFile() {
  const file = fileUpload.files[0];
  if (!file) {
    showToast("Por favor, selecione um arquivo!", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      state.excelData = jsonData;
      processData(jsonData);
      showToast("Dados carregados com sucesso!");
    } catch (error) {
      console.error("Error processing Excel file:", error);
      showToast("Erro ao processar o arquivo!", "error");
    }
  };

  reader.onerror = function () {
    showToast("Erro ao ler o arquivo!", "error");
  };

  reader.readAsBinaryString(file);
}

function processData(data) {
  if (!data || data.length === 0) {
    showToast("Nenhum dado encontrado na planilha!", "error");
    return;
  }

  // Assuming the Excel structure has columns: Nome, Turma, Disciplina, Ano, Nota, etc.
  // This is a sample processing - adjust based on your actual data structure
  state.processedData = data.map((item) => ({
    name: item.Nome || item.Aluno || item.name || "Desconhecido",
    class: item.Turma || item.class || "Desconhecida",
    subject: item.Disciplina || item.subject || "Desconhecida",
    year: item.Ano || item.year || new Date().getFullYear().toString(),
    grade: parseFloat(item.Nota || item.grade || 0),
    status: (item.Nota || item.grade || 0) >= 6 ? "Aprovado" : "Reprovado",
  }));

  state.filteredData = [...state.processedData];

  // Extract unique values for filters
  state.years = [...new Set(state.processedData.map((item) => item.year))];
  state.classes = [...new Set(state.processedData.map((item) => item.class))];
  state.subjects = [
    ...new Set(state.processedData.map((item) => item.subject)),
  ];

  // Populate filter dropdowns
  populateFilters();

  // Calculate statistics
  calculateStats();

  // Create charts
  createCharts();

  // Display data table
  state.currentPage = 1;
  updateTable();
}

function populateFilters() {
  // Clear current options (keep the "All" option)
  yearFilter.innerHTML = '<option value="">Todos</option>';
  classFilter.innerHTML = '<option value="">Todas</option>';
  subjectFilter.innerHTML = '<option value="">Todas</option>';

  // Add new options
  state.years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  state.classes.forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classFilter.appendChild(option);
  });

  state.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });
}

function applyFilters() {
  state.filters = {
    year: yearFilter.value,
    class: classFilter.value,
    subject: subjectFilter.value,
  };

  state.filteredData = state.processedData.filter((item) => {
    const yearMatch = !state.filters.year || item.year === state.filters.year;
    const classMatch =
      !state.filters.class || item.class === state.filters.class;
    const subjectMatch =
      !state.filters.subject || item.subject === state.filters.subject;
    return yearMatch && classMatch && subjectMatch;
  });

  state.currentPage = 1;
  updateTable();
  calculateStats();
  updateCharts();
  showToast("Filtros aplicados!");
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();

  if (searchTerm === "") {
    applyFilters(); // Revert to just using the dropdown filters
    return;
  }

  // Filter based on both search term and dropdown filters
  state.filteredData = state.processedData.filter((item) => {
    const searchMatch = item.name.toLowerCase().includes(searchTerm);
    const yearMatch = !state.filters.year || item.year === state.filters.year;
    const classMatch =
      !state.filters.class || item.class === state.filters.class;
    const subjectMatch =
      !state.filters.subject || item.subject === state.filters.subject;
    return searchMatch && yearMatch && classMatch && subjectMatch;
  });

  state.currentPage = 1;
  updateTable();
}

function calculateStats() {
  const data = state.filteredData;

  if (data.length === 0) {
    totalStudents.textContent = "0";
    averageGrade.textContent = "0";
    approvalRate.textContent = "0%";
    criticalSubject.textContent = "N/A";
    return;
  }

  // Total unique students
  const uniqueStudents = [...new Set(data.map((item) => item.name))].length;
  totalStudents.textContent = uniqueStudents;

  // Average grade
  const avgGrade =
    data.reduce((sum, item) => sum + item.grade, 0) / data.length;
  averageGrade.textContent = avgGrade.toFixed(1);

  // Approval rate
  const approved = data.filter((item) => item.grade >= 6).length;
  const approvalPercentage = (approved / data.length) * 100;
  approvalRate.textContent = `${approvalPercentage.toFixed(1)}%`;

  // Find critical subject (lowest average grade)
  const subjectGrades = {};
  data.forEach((item) => {
    if (!subjectGrades[item.subject]) {
      subjectGrades[item.subject] = {
        sum: 0,
        count: 0,
      };
    }
    subjectGrades[item.subject].sum += item.grade;
    subjectGrades[item.subject].count += 1;
  });

  let lowestAvg = 10;
  let criticalSubjectName = "N/A";

  Object.entries(subjectGrades).forEach(([subject, stats]) => {
    const avg = stats.sum / stats.count;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      criticalSubjectName = subject;
    }
  });

  criticalSubject.textContent = criticalSubjectName;
}

function createCharts() {
  // Create or update subject performance chart
  const subjectsCtx = document
    .getElementById("subjects-chart")
    .getContext("2d");

  if (subjectsChart) {
    subjectsChart.destroy();
  }

  // Calculate average grade by subject
  const subjectAverages = {};
  state.subjects.forEach((subject) => {
    const subjectData = state.filteredData.filter(
      (item) => item.subject === subject
    );
    const average =
      subjectData.reduce((sum, item) => sum + item.grade, 0) /
        subjectData.length || 0;
    subjectAverages[subject] = average;
  });

  subjectsChart = new Chart(subjectsCtx, {
    type: "bar",
    data: {
      labels: Object.keys(subjectAverages),
      datasets: [
        {
          label: "Média por Disciplina",
          data: Object.values(subjectAverages),
          backgroundColor: "#ea384c88",
          borderColor: "#ea384c",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
        },
      },
    },
  });

  // Evolution chart (assuming we have time-based data like bimesters)
  // This is a placeholder example - adjust based on your data structure
  const evolutionCtx = document
    .getElementById("evolution-chart")
    .getContext("2d");

  if (evolutionChart) {
    evolutionChart.destroy();
  }

  evolutionChart = new Chart(evolutionCtx, {
    type: "line",
    data: {
      labels: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"],
      datasets: [
        {
          label: "Evolução da Média Geral",
          data: [6.5, 7.2, 6.8, 7.9], // Sample data - replace with actual data
          borderColor: "#ea384c",
          backgroundColor: "#ea384c22",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
        },
      },
    },
  });
}

function updateCharts() {
  if (!subjectsChart || !evolutionChart) {
    createCharts();
    return;
  }

  // Update subjects chart
  const subjectAverages = {};
  state.subjects.forEach((subject) => {
    const subjectData = state.filteredData.filter(
      (item) => item.subject === subject
    );
    const average =
      subjectData.reduce((sum, item) => sum + item.grade, 0) /
        subjectData.length || 0;
    subjectAverages[subject] = average;
  });

  subjectsChart.data.labels = Object.keys(subjectAverages);
  subjectsChart.data.datasets[0].data = Object.values(subjectAverages);
  subjectsChart.update();

  // Update evolution chart (placeholder logic)
  // In a real implementation, you would calculate time-based averages here
  evolutionChart.update();
}

function updateTable() {
  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML = "";

  if (!state.filteredData || state.filteredData.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="5" class="no-data">Nenhum dado encontrado com os filtros atuais.</td>';
    tbody.appendChild(row);

    // Update pagination info
    pageInfo.textContent = "Página 0 de 0";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, state.filteredData.length);
  const pageData = state.filteredData.slice(start, end);

  // Add rows to table
  pageData.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.class}</td>
      <td>${item.subject}</td>
      <td>${item.grade.toFixed(1)}</td>
      <td class="${item.status === "Aprovado" ? "success" : "danger"}">${
      item.status
    }</td>
    `;

    tbody.appendChild(row);
  });

  // Update pagination info
  pageInfo.textContent = `Página ${state.currentPage} de ${totalPages}`;
  prevPageBtn.disabled = state.currentPage === 1;
  nextPageBtn.disabled = state.currentPage === totalPages;
}

function changePage(direction) {
  const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
  const newPage = state.currentPage + direction;

  if (newPage < 1 || newPage > totalPages) {
    return;
  }

  state.currentPage = newPage;
  updateTable();
}

function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toast.classList.remove("hidden");

  if (type === "error") {
    toast.style.backgroundColor = "var(--danger)";
  } else {
    toast.style.backgroundColor = "var(--primary)";
  }

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function resetState() {
  state.excelData = null;
  state.processedData = null;
  state.filteredData = null;
  state.years = [];
  state.classes = [];
  state.subjects = [];
  state.currentPage = 1;
  state.filters = {
    year: "",
    class: "",
    subject: "",
  };

  // Reset UI
  fileName.textContent = "Nenhum arquivo selecionado";
  uploadBtn.disabled = true;
  yearFilter.innerHTML = '<option value="">Todos</option>';
  classFilter.innerHTML = '<option value="">Todas</option>';
  subjectFilter.innerHTML = '<option value="">Todas</option>';
  searchInput.value = "";

  // Reset stats
  totalStudents.textContent = "--";
  averageGrade.textContent = "--";
  approvalRate.textContent = "--";
  criticalSubject.textContent = "--";

  // Reset table
  const tbody = dataTable.querySelector("tbody");
  tbody.innerHTML =
    '<tr><td colspan="5" class="no-data">Nenhum dado disponível. Importe uma planilha.</td></tr>';

  // Reset pagination
  pageInfo.textContent = "Página 1 de 1";
  prevPageBtn.disabled = true;
  nextPageBtn.disabled = true;

  // Destroy charts
  if (subjectsChart) {
    subjectsChart.destroy();
    subjectsChart = null;
  }

  if (evolutionChart) {
    evolutionChart.destroy();
    evolutionChart = null;
  }
}
