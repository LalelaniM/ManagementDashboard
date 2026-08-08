const express = require("express");
const axios = require("axios");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");
let productCache = {};
const app = express();
//const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

/*
====================================================
    VERIFY USER
====================================================
*/
/*const CLIENT_CODE = process.env.CLIENT_CODE;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const ERPLY_URL = process.env.ERPLY_URL;*/

const CLIENT_CODE = "538868";
const USERNAME = "Gift";
const PASSWORD = "Gift9663";
const ERPLY_URL =`https://538868.erply.com/api/`;

let sessionKey = null;
let sessionExpiry = 0;

/*************************************************
 * VERIFY USER
 *************************************************/

async function verifyUser() {

    // Use cached session if still valid

    if (sessionKey && Date.now() < sessionExpiry) {
        return sessionKey;
    }

    try {
        const formData = new URLSearchParams();

        formData.append("clientCode", CLIENT_CODE);
        formData.append("username", USERNAME);
        formData.append("password", PASSWORD);
        formData.append("request", "verifyUser");

        const response = await axios.post(ERPLY_URL,formData,{headers: {"Content-Type":"application/x-www-form-urlencoded"}});
        const data = response.data;

        if (!data.status || data.status.responseStatus !== "ok")
            {
               throw new Error("ERPLY Login Failed");
            }

        sessionKey = data.records[0].sessionKey;

        // Cache for 55 minutes
        sessionExpiry = Date.now() + (55 * 60 * 1000);
        console.log("ERPLY Login Successful");

        return sessionKey;
    }
    catch (err) 
    {
        console.error(err.response?.data || err.message);
        throw err;
    }

}

/*
====================================================
    TODAY'S DATE
====================================================
*/

function today() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
/*
====================================================
    DOWNLOAD CSV
====================================================
*/

async function downloadCSV(url) 
{
    const response = await axios.get(url, {responseType: "text"});
    return response.data;
}

function parseCSV(text) 
{
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
                    if (c === "\r" && text[i + 1] === "\n") {
                        i++;
                    }
                }
        else 
            {
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

function getTotalSales(csv) {
    const rows = parseCSV(csv);
    if (rows.length < 2) 
        {
            return 0;
        }

    const headers = rows[0].map(h =>h.replace(/"/g, "").trim());
    const salesIndex = headers.indexOf("SALES_WITH_VAT_TOTAL");

    if (salesIndex === -1) 
        {
            console.log("SALES_WITH_VAT_TOTAL column not found.");
            return 0;
        }

    const totalRow = rows.find(row => row.some(cell => cell.trim().toUpperCase() === "TOTAL"));

    if (!totalRow) {
        console.log("TOTAL row not found.");
        return 0;
    }

    const totalSales = parseFloat(totalRow[salesIndex]) || 0;
    return totalSales;

}

/*
====================================================
    GET SALES REPORT
====================================================
*/

function formatDate(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


async function getSalesReport(reportType, dateStart = null, dateEnd = null) {
    const sessionKey = await verifyUser();
    const todayDate = today();
    dateStart = dateStart || todayDate;
    dateEnd = dateEnd || todayDate;
    const params = new URLSearchParams();

    params.append("clientCode", CLIENT_CODE);
    params.append("sessionKey", sessionKey);

    params.append("request", "getSalesReport");

    params.append("dateStart", dateStart);
    params.append("dateEnd", dateEnd);

    params.append("warehouseID", "1");
    params.append("byStockOfficeID", "1");

    params.append("reportType", reportType);
    params.append("responseType", "json");

    const response = await axios.post(ERPLY_URL,params,{headers: {"Content-Type": "application/x-www-form-urlencoded"}});
    const data = response.data;

    if 
    (
        !data.records ||
        data.records.length === 0 ||
        !data.records[0].reportLink
    ) 
    {
        throw new Error("No report returned.");
    }

    const reportLink = data.records[0].reportLink;
    const csv = await downloadCSV(reportLink);
    return csv;
}

async function getTransferReport(date) {

    const sessionKey = await verifyUser();

    const params = new URLSearchParams();

    params.append("clientCode", CLIENT_CODE);
    params.append("sessionKey", sessionKey);

    params.append("request", "getInventoryTransfers");

    params.append("recordsOnPage", "100");
    params.append("pageNo", "1");

    params.append("getProductInfo", "1");
    params.append("getRows", "1");

    params.append("dateFrom", date);
    params.append("dateTo", date);
    
    

    const response = await axios.post(
        ERPLY_URL,
        params,
        {
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            }
        }
    );

    console.log(
    JSON.stringify(response.data.records[0], null, 2)
    );

    return response.data;
}

async function getProductsByIDs(productIDs) {

    if (productIDs.length === 0) {
        return {};
    }

    const lookup = {};

    const sessionKey = await verifyUser();

    const params = new URLSearchParams();

    params.append("clientCode", CLIENT_CODE);
    params.append("sessionKey", sessionKey);
    params.append("request", "getProducts");

    params.append("recordsOnPage", productIDs.length);
    params.append("pageNo", "1");

    // ERPLY accepts comma-separated IDs
    params.append("productIDs", productIDs.join(","));

    const response = await axios.post(
        ERPLY_URL,
        params,
        {
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            }
        }
    );

    response.data.records.forEach(product => {

        const ukSize =
            (product.variationDescription || [])
                .find(v => v.name === "UK Size")
                ?.value || "";

        lookup[product.productID] = {

            code: product.code,
            name: product.name,
            size: ukSize

        };

    });

    return lookup;

}


function getTargets() {

    const workbook = XLSX.readFile(path.join(__dirname,"targets","TargetSheet.xlsx"));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
    
    // Monthly target is in B3
    const monthlyTarget = data[2][1];

    // Get today's day number (1-31)
    const today = new Date().getDate();

    let dailyTarget = 0;
    let mtdTarget = 0;

    // Daily targets start on row 5 (index 4)
    for (let i = 4; i < data.length; i++) {

        const day = Number(data[i][1]);
        const target = Number(data[i][2]) || 0;

        if (day > 0 && day <= today) {
            mtdTarget += target;
        }

        if (day === today) {
            dailyTarget = target;
        }
    }
   

    return {
            monthlyTarget,
            dailyTarget,
            mtdTarget
        };

}

/*
====================================================
    API
====================================================
*/

app.get("/api/report", async (req, res) => {

    try 
    {
        const productCSV = await getSalesReport("SALES_BY_PRODUCT");
        const cashierCSV = await getSalesReport("SALES_BY_CASHIER");

        // Month To Date dates
        const now = new Date();
        const monthStart = formatDate(new Date(now.getFullYear(),now.getMonth(),1));
        const monthEnd = formatDate(now);

        const monthToDateCSV = await getSalesReport("SALES_BY_PRODUCT",monthStart,monthEnd);
        const monthToDateSales = getTotalSales(monthToDateCSV);
        const targets = getTargets();

        res.json({
            productReport: productCSV,
            cashierReport: cashierCSV,
            monthToDateSales,
            monthlyTarget: targets.monthlyTarget,
            dailyTarget: targets.dailyTarget,
            mtdTarget: targets.mtdTarget
        });

    }
    catch (err) 
    {
        console.error(err);
        res.status(500).json({success: false,error: err.message});
    }

});

app.get("/api/transfers", async (req, res) => {

    try {

        const date = req.query.date || today();

        // Get transfers
        const transfers = await getTransferReport(date);

        // Collect every unique productID
        const productIDs = [
            ...new Set(
                transfers.records.flatMap(t =>
                    t.rows.map(r => r.productID)
                )
            )
        ];

        console.log(`Products needed: ${productIDs.length}`);

        // Load ONLY those products
        const productLookup =
            await getProductsByIDs(productIDs);

        // Add product details to each row
        transfers.records.forEach(transfer => {

            transfer.rows.forEach(row => {

                const product =
                    productLookup[row.productID];

                row.code = product?.code || "";
                row.name = product?.name || `Product ${row.productID}`;
                row.size = product?.size || "";

            });

        });

        const warehouseLookup =
            await getWarehouseLookup();
            transfers.records.forEach(transfer => {

    const d = new Date(transfer.added * 1000);

    transfer.time = d.toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    });

        res.json({

            transfers: transfers.records,
            warehouses: warehouseLookup,
            products: productLookup

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

});


async function getWarehouseLookup() {

    const sessionKey = await verifyUser();

    const params = new URLSearchParams();

    params.append("clientCode", CLIENT_CODE);
    params.append("sessionKey", sessionKey);

    params.append("request", "getWarehouses");

    const response = await axios.post(
        ERPLY_URL,
        params,
        {
            headers:{
                "Content-Type":"application/x-www-form-urlencoded"
            }
        }
    );

    const lookup = {};

    response.data.records.forEach(w => {

        lookup[w.warehouseID] = w.name;

    });

    return lookup;

}


/*
====================================================
    START SERVER
====================================================
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});