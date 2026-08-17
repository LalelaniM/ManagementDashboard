
console.log("APP VERSION 8");
const todayDate = document.getElementById("todayDate");
const showReportBtn = document.getElementById("showReportBtn");
const shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const reportContainer = document.getElementById("reportContainer");
const reportDate = document.getElementById("reportDate");

const transferDashboard =
    document.getElementById("transferDashboard");

const transferContainer =
    document.getElementById("transferContainer");

const showTransfersBtn =
    document.getElementById("showTransfersBtn");

// Display today's date
const today = new Date();


reportDate.value =
    today.toISOString().split("T")[0];

todayDate.textContent = today.toLocaleDateString("en-ZA", {year: "numeric",month: "long",day: "numeric"});

// Button click
showReportBtn.addEventListener("click", loadReport);
//shareWhatsAppBtn.addEventListener("click", shareWhatsApp);
showTransfersBtn.addEventListener(
    "click",
    loadTransfers
);

async function loadReport() {

    transferDashboard.classList.add("hidden");

    transferContainer.classList.add("hidden");

    reportContainer.classList.remove("hidden");

    loading.classList.remove("hidden");
    error.classList.add("hidden");
    showReportBtn.disabled = true;
    reportContainer.innerHTML = "";
    document.getElementById("dashboard").classList.add("hidden");

    try 
    {
        const selectedDate = reportDate.value;

        const response = await fetch(
            `/api/report?date=${selectedDate}`
        );

        if (!response.ok) 
            {
                throw new Error("Unable to generate report.");
            }

        const reports = await response.json();

        document.getElementById("dashboard").classList.remove("hidden");

        buildReports(
            reports.productReport,
            reports.cashierReport,
            reports.top10Products
        );

        updateDashboard(
            reports.productReport,
            reports.cashierReport,
            reports.monthToDateSales,
            reports.monthlyTarget,
            reports.dailyTarget,
            reports.mtdTarget

        );

    }
    catch (err) 
    {
        document.getElementById("dashboard").classList.add("hidden");
        error.textContent = err.message;
        error.classList.remove("hidden");
    }
    finally 
    {
        loading.classList.add("hidden");
        showReportBtn.disabled = false;
    }

}

/*
-------------------------------------
    CSV PARSER

    Handles quoted fields correctly.
-------------------------------------
*/

function parseCSV(text) {

    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) 
        {
            const c = text[i];

            if (c === '"') 
                {
                    if (inQuotes && text[i + 1] === '"') 
                        {
                            value += '"';
                            i++;
                        }
                    else 
                        {
                            inQuotes = !inQuotes;
                        }
                }

            else if (c === "," && !inQuotes) 
                {
                    row.push(value);
                    value = "";
                }

            else if ((c === "\n" || c === "\r") && !inQuotes) 
                {
                    if (value !== "" || row.length > 0) 
                        {
                            row.push(value);
                            rows.push(row);
                        }
                    row = [];
                    value = "";

                if (c === "\r" && text[i + 1] === "\n") 
                    {
                        i++;
                    }
                }

            else {

                value += c;

            }
        }

    if (value !== "" || row.length > 0) 
        {
            row.push(value);
            rows.push(row);
        }

    return rows;

}

/*
-------------------------------------
    BUILD HTML TABLE
-------------------------------------
*/

function buildReports(productCSV, cashierCSV, top10Products ) {

    reportContainer.innerHTML = "";

    reportContainer.appendChild(
        createTableSection(
            "Sales By Product",
            productCSV,
            [
                "PRODUCT_ID",
                "LINE_NUMBER",
                "SERVICE_ID",
                "EAN_CODE",
                "UNIT",
                "NET_SALES_TOTAL",
                "DISCOUNT_TOTAL",
                "DISCOUNT_PERCENTAGE"
            ]
        )

    );

    reportContainer.appendChild(
        createTableSection(
            "Sales By Cashier",
            cashierCSV,
            [
                "EMPLOYEE_ID",
                "AVERAGE_SALE",
                "AVERAGE_BASKET",
                "DISCOUNT_TOTAL",
                "DISCOUNT_PERCENTAGE",
                "NET_SALES_TOTAL",
                "VAT_TOTAL - ID:1 - 15%",
                "VAT_RATE_ID:1 - 15%",
                "VAT_RATE:1 - 15%",
                "UNIT",
                "EAN_CODE",
                "PRODUCT_ID",
                "AVERAGE_UNITS_PER_TRANSACTION",
                "AVERAGE_VALUE_SOLD",
                "LINE_NUMBER",
                "SERVICE_ID"
            ]
        )

    );

    reportContainer.appendChild(
    createTop10Table(top10Products)
    );

}

function createTop10Table(products) {

    const section = document.createElement("div");

    section.style.marginTop = "40px";

    const heading = document.createElement("h2");

    heading.textContent =
        "Top 10 Most Sold Products - Current Month";

    heading.style.marginBottom = "15px";

    heading.style.color = "#0066cc";

    section.appendChild(heading);

    if (!products || products.length === 0) {

        const message =
            document.createElement("p");

        message.textContent =
            "No product sales available.";

        section.appendChild(message);

        return section;

    }

    let html = `
        <div class="table-wrapper">

            <table class="top-products-table">

                <thead>

                    <tr>

                        <th>Rank</th>

                        <th>Product</th>

                        <th>Qty Sold</th>

                        <th>Sales</th>

                    </tr>

                </thead>

                <tbody>
    `;

    products.forEach((product, index) => {

        html += `

            <tr>

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${product.productName}
                </td>

                <td>
                    ${Number(product.quantity)
                        .toLocaleString("en-ZA")}
                </td>

                <td>
                    R ${Number(product.sales)
                        .toLocaleString("en-ZA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                </td>

            </tr>

        `;

    });

    html += `

                </tbody>

            </table>

        </div>

    `;

    section.innerHTML += html;

    return section;

}

const columnNames = {

    "Sales By Product": {

        "PRODUCT_NAME": "Product",
        "SOLD_QUANTITY": "Qty",
        "SALES_WITH_VAT_TOTAL": "Price"

    },

    "Sales By Cashier": {

        "EMPLOYEE_NAME": "Cashier",
        "NUMBER_OF_SALES": "Transactions",
        "SOLD_QUANTITY": "Qty",
        "SALES_WITH_VAT_TOTAL": "Sales",
        "AVERAGE_SALE": "Avg Sale",
        "AVERAGE_BASKET": "UPT"

    }

};

function createTableSection(title, csv, hiddenColumns) {

    const section = document.createElement("div");
    section.style.marginTop = "40px";
    const heading = document.createElement("h2");
    heading.textContent = title;
    heading.style.marginBottom = "15px";
    heading.style.color = "#0066cc";
    section.appendChild(heading);
    const rows = parseCSV(csv);
    if (rows.length === 0) 
        {
            section.innerHTML += "<p>No data available.</p>";
            return section;
        }

    const headers = rows[0];
    const data = rows.slice(1);
    const visibleColumns = headers.map((header, index) => ({header: header.replace(/"/g, "").trim(),index})).filter(col => !hiddenColumns.includes(col.header));

    let html = '<div class="table-wrapper">';
    html += "<table>";
    html += "<thead><tr>";

    visibleColumns.forEach(col => {

    let header = col.header;

    if (columnNames[title]?.[header]) {

        header = columnNames[title][header];

    }
    html += `<th>${header}</th>`;
    });

    html += "</tr></thead>";
    html += "<tbody>";

    data.forEach(row => {
        if (row.some(cell => cell.trim().toUpperCase() === "TOTAL")) 
            {
                return;
            }

        if (row.length === 1 && row[0] === "") return;

        html += "<tr>";

        visibleColumns.forEach(col => {
            const value = row[col.index] || "";

            html += `<td>${value.replace(/"/g, "")}</td>`;

        });

        html += "</tr>";

    });

    html += "</tbody>";

    html += "</table>";

    html += "</div>";

    section.innerHTML += html;

    return section;

}

function updateDashboard(
    productCSV,
    cashierCSV,
    monthToDateSales,
    monthlyTarget,
    dailyTarget,
    mtdTarget
    ) 
    {

    const dashboard = document.getElementById("dashboard");
    dashboard.classList.remove("hidden");

    // ==========================
    // MTD PROGRESS RINGS
    // ==========================
    const mtdCircle =
            document.getElementById("mtdProgressCircle");

        const mtdPercentText =
            document.getElementById("mtdProgressPercent");

        const monthlyCircle =
            document.getElementById("monthlyProgressCircle");

        const monthlyPercentText =
            document.getElementById("monthlyProgressPercent");

        const mtdRadius = 55;
        const mtdCircumference =
            2 * Math.PI * mtdRadius;

            if (mtdCircle && monthlyCircle) {

    mtdCircle.style.strokeDasharray =
        mtdCircumference;

    mtdCircle.style.strokeDashoffset =
        mtdCircumference;

    monthlyCircle.style.strokeDasharray =
        mtdCircumference;

    monthlyCircle.style.strokeDashoffset =
        mtdCircumference;
}

    // ==========================
    // PRODUCT REPORT
    // ==========================

    const productRows = parseCSV(productCSV);

    if (productRows.length < 2) return;

    const productHeaders = productRows[0].map(h =>h.replace(/"/g, "").trim());

    const qtyIndex = productHeaders.indexOf("SOLD_QUANTITY");
    const salesIndex = productHeaders.indexOf("SALES_WITH_VAT_TOTAL");

    const productTotal = productRows.find(row =>row.some(cell =>cell.trim().toUpperCase() === "TOTAL"));

    let totalSales = 0;
    let totalQty = 0;

    if (productTotal) 
        {
            totalSales = parseFloat(productTotal[salesIndex]) || 0;
        totalQty = parseFloat(productTotal[qtyIndex]) || 0;
        }

    // ==========================
    // CASHIER REPORT
    // ==========================

    const cashierRows = parseCSV(cashierCSV);

    const cashierHeaders = cashierRows[0].map(h =>h.replace(/"/g, "").trim());

    const transactionIndex = cashierHeaders.indexOf("NUMBER_OF_SALES");

    const cashierTotal = cashierRows.find(row =>row.some(cell =>cell.trim().toUpperCase() === "TOTAL"));

    let totalTransactions = 0;

    if (cashierTotal) 
        {
            totalTransactions = parseFloat(cashierTotal[transactionIndex]) || 0;
        }

    // ==========================
    // CALCULATIONS
    // ==========================

    const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const variance = totalSales - Number(dailyTarget);

    const percentToTarget = Number(dailyTarget) > 0 ? (totalSales / Number(dailyTarget)) * 100 : 0;

    const upt = totalTransactions > 0 ? totalQty / totalTransactions : 0;

    const mtdProgress =
    mtdTarget > 0
        ? (monthToDateSales / mtdTarget) * 100
        : 0;

    const monthlyProgress =
    Number(monthlyTarget) > 0
        ? (monthToDateSales / Number(monthlyTarget)) * 100
        : 0;


        // --------------------------
        // MTD TARGET
        // --------------------------

        // ==========================
// MTD PROGRESS RINGS
// ==========================

if (
    mtdCircle &&
    mtdPercentText &&
    monthlyCircle &&
    monthlyPercentText
) {

    // --------------------------
    // MTD TARGET
    // --------------------------

    const mtdRingPercent =
        Math.min(mtdProgress, 100);

    const mtdOffset =
        mtdCircumference -
        (mtdRingPercent / 100) *
        mtdCircumference;

    mtdCircle.style.strokeDasharray =
        mtdCircumference;

    mtdCircle.style.strokeDashoffset =
        mtdOffset;

    mtdPercentText.textContent =
        mtdProgress.toFixed(0) + "%";


    // --------------------------
    // MONTHLY TARGET
    // --------------------------

    const monthlyRingPercent =
        Math.min(monthlyProgress, 100);

    const monthlyOffset =
        mtdCircumference -
        (monthlyRingPercent / 100) *
        mtdCircumference;

    monthlyCircle.style.strokeDasharray =
        mtdCircumference;

    monthlyCircle.style.strokeDashoffset =
        monthlyOffset;

    monthlyPercentText.textContent =
        monthlyProgress.toFixed(0) + "%";

}


        // --------------------------
        // MONTHLY TARGET
        // --------------------------

        const monthlyRingPercent =
            Math.min(monthlyProgress, 100);

        const monthlyOffset =
            mtdCircumference -
            (monthlyRingPercent / 100) *
            mtdCircumference;

        monthlyCircle.style.strokeDasharray =
            mtdCircumference;

        monthlyCircle.style.strokeDashoffset =
            monthlyOffset;

        monthlyPercentText.textContent =
            monthlyProgress.toFixed(0) + "%";

    // ==========================
    // UPDATE DASHBOARD
    // ==========================

  

    document.getElementById("totalSales").textContent ="R " + totalSales.toLocaleString("en-ZA", {minimumFractionDigits: 2,maximumFractionDigits: 2});

    document.getElementById("totalQty").textContent =
        totalQty.toLocaleString("en-ZA");

    document.getElementById("totalTransactions").textContent =
        totalTransactions.toLocaleString("en-ZA");

    document.getElementById("averageSale").textContent =
        "R " +
        averageSale.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    /*document.getElementById("monthlyTarget").textContent =
        "R " +
        Number(monthlyTarget).toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });*/

    document.getElementById("dailyTarget").textContent =
        "R " +
        Number(dailyTarget).toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        document.getElementById("varianceTarget").textContent =
    (variance >= 0 ? "+" : "-") +
    "R " +
    Math.abs(variance).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });



    document.getElementById("upt").textContent =
        upt.toFixed(2);

    document.getElementById("monthToDate").textContent =
    "R " +
    Number(monthToDateSales).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    document.getElementById("mtdTarget").textContent =
    "R " +
    Number(mtdTarget).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
        });

        const circle = document.getElementById("progressCircle");
        const outerCircle = document.getElementById("outerProgressCircle");
        const percentText = document.getElementById("progressPercent");


        // =====================================
        // INNER RING: 0% → 100%
        // =====================================

        const innerRadius = 70;
        const innerCircumference =
            2 * Math.PI * innerRadius;

        const actualPercent = percentToTarget;

        const innerPercent =
            Math.min(actualPercent, 100);

        const innerOffset =
            innerCircumference -
            (innerPercent / 100) * innerCircumference;

        circle.style.strokeDasharray =
            innerCircumference;

        circle.style.strokeDashoffset =
            innerOffset;


        // =====================================
        // OUTER RING: 100% → 200%
        // =====================================

        // =====================================
        // OUTER RING: 100% → 200%
        // =====================================

        const outerRadius = 88;
        const outerCircumference =
            2 * Math.PI * outerRadius;

        let outerPercent = 0;

        if (actualPercent > 100) {

            outerPercent =
                Math.min(actualPercent - 100, 100);

        }

        const outerOffset =
            outerCircumference -
            (outerPercent / 100) * outerCircumference;

        outerCircle.style.strokeDasharray =
            outerCircumference;

        outerCircle.style.strokeDashoffset =
            outerOffset;


        // Only show the outer ring ABOVE 100%
        if (actualPercent > 100) {

            outerCircle.style.opacity = "1";

        } else {

            outerCircle.style.opacity = "0";

        }


        // =====================================
        // DISPLAY ACTUAL PERCENTAGE
        // =====================================

        percentText.textContent =
            actualPercent.toFixed(0) + "%";

        // Change colour when target exceeded
        if (actualPercent >= 100) {
            circle.style.stroke = "#22c55e";      // Green
        } else if (actualPercent >= 50) {
            circle.style.stroke = "#f59e0b";      // Orange
        } else {
            circle.style.stroke = "#3b82f6";      // Blue
        }

        if (actualPercent > 100) {
            outerCircle.style.stroke = "#22c55e";
        } else {
            outerCircle.style.stroke = "transparent";
        }
        
}

function shareWhatsApp() {

    const date =
        document.getElementById("todayDate").textContent;

    const totalSales =
        document.getElementById("totalSales").textContent;

    const qtySold =
        document.getElementById("totalQty").textContent;

    const transactions =
        document.getElementById("totalTransactions").textContent;

    const averageSale =
        document.getElementById("averageSale").textContent;

    const upt =
        document.getElementById("upt").textContent;

    const dailyTarget =
        document.getElementById("dailyTarget").textContent;

    const variance =
        document.getElementById("varianceTarget").textContent;

    const percent =
        document.getElementById("percentTarget").textContent;

    const monthlyTarget =
        document.getElementById("monthlyTarget").textContent;

    const mtd =
        document.getElementById("monthToDate").textContent;

    const message =
    `📊 *Daily Sales Summary*

    📅 Date: ${date}

    💰 Total Sales: ${totalSales}
    🛒 Qty Sold: ${qtySold}
    🧾 Transactions: ${transactions}
    💵 Average Sale: ${averageSale}
    📦 UPT: ${upt}

    🎯 Daily Target: ${dailyTarget}
    📈 Variance: ${variance}
    ✅ Target Achieved: ${percent}

    📆 Month To Date: ${mtd}
    🎯 Monthly Target: ${monthlyTarget}`;

    const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank");

    

}

async function loadTransfers() {

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    document.getElementById("dashboard").classList.add("hidden");
    reportContainer.classList.add("hidden");

    transferDashboard.classList.remove("hidden");
    transferContainer.classList.remove("hidden");

    try {

        const date = reportDate.value;

        const response = await fetch(
            `/api/transfers?date=${date}`
        );

        if (!response.ok) {
            throw new Error("Unable to load transfers.");
        }

        const data = await response.json();

            buildTransfers(

        data.transfers,

        data.warehouses
        );
        updateTransferDashboard(data.transfers);

    }
    catch (err) {

        error.textContent = err.message;
        error.classList.remove("hidden");

    }
    finally {

        loading.classList.add("hidden");

    }

}

function buildTransfers(

    transfers,

    warehouses
    ) {


    transferContainer.innerHTML = "";

    if (!transfers.length) {

        transferContainer.innerHTML =
            "<p>No transfers found.</p>";

        return;

    }

    let html = `
    <table class="transfer-table">

        <thead>

            <tr>

                <th>Transfer No</th>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th></th>

            </tr>

        </thead>

        <tbody>
    `;

    transfers.forEach((transfer, index) => {

        html += `
        <tr class="transfer-row">

            <td>${transfer.inventoryTransferNo}</td>

            <td>${transfer.date}<br><small>${transfer.time}</small></td>

            <td>${warehouses[transfer.warehouseFromID]}</td>

            <td>${warehouses[transfer.warehouseToID]}</td>

            <td>${transfer.rows.length}</td>

            <td>

                <button
                    onclick="toggleTransfer(${index})">

                    ▼

                </button>

            </td>

        </tr>

        <tr
            id="transfer-${index}"
            class="hidden">

            <td colspan="6">

                ${buildTransferRows(

    transfer.rows

    )}

            </td>

        </tr>
        `;

    });

    html += "</tbody></table>";

    transferContainer.innerHTML = html;

}
function updateTransferDashboard(transfers) {

    let transferCount = transfers.length;
    let itemsMoved = 0;
    let retailToStore = 0;
    let storeToRetail = 0;

    transfers.forEach(transfer => {

        transfer.rows.forEach(row => {

            const qty = Number(row.amount) || 0;

            itemsMoved += qty;

            // Retail (1) -> Storeroom (2)
            if (
                transfer.warehouseFromID == 1 &&
                transfer.warehouseToID == 2
            ) {
                retailToStore += qty;
            }

            // Storeroom (2) -> Retail (1)
            if (
                transfer.warehouseFromID == 2 &&
                transfer.warehouseToID == 1
            ) {
                storeToRetail += qty;
            }

        });

    });

    document.getElementById("transferCount").textContent = transferCount;
    document.getElementById("itemsMoved").textContent = itemsMoved;
    document.getElementById("retailToStore").textContent = retailToStore;
    document.getElementById("storeToRetail").textContent = storeToRetail;

}



function toggleTransfer(index) {

    document
        .getElementById(`transfer-${index}`)
        .classList.toggle("hidden");

}


function buildTransferRows(rows) {

    let html = `
<table class="nested-table">

    <thead>

        <tr>

            <th>Code</th>
            <th>Product</th>
            <th>Size</th>
            <th>Qty</th>

        </tr>

    </thead>

    <tbody>
`;

    rows.forEach(row => {

    html += `
    <tr>

        <td>${row.code}</td>

        <td>${row.name}</td>

        <td>${row.size}</td>

        <td>${row.amount}</td>

        </tr>
    `   ;

    });

    html += "</tbody></table>";

    return html;

}