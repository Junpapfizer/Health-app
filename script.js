// ==========================================
// ⚙️ ตั้งค่าระบบ
const LIFF_ID = "2008799065-MIMzWyU2"; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzwOUnKV4NfnXh4XQUifMoOk8zMgDXujqKUHTQlDG-jmlh5i5f6BwazyPY7JB1NOm06/exec";
// ==========================================

// ข้อมูลโซเดียม (mg ต่อ 1 ช้อนชา)
const sodiumData = {
    "น้ำปลา (400 mg)": 400,
    "ซีอิ๊วขาว (350 mg)": 350,
    "ซอสหอยนางรม (300 mg)": 300,
    "ซอสปรุงรส (320 mg)": 320,
    "เกลือ (2300 mg)": 2300,
    "ผงชูรส (150 mg)": 150
};

// ฟังก์ชันสลับหน้าจอ
function showSection(sectionId) {
    document.getElementById('section-bmi').style.display = 'none';
    document.getElementById('section-bp').style.display = 'none';
    
    // เช็คก่อนว่ามีหน้า salt ไหมเพื่อกัน Error
    if(document.getElementById('section-salt')) {
        document.getElementById('section-salt').style.display = 'none';
    }

    document.getElementById(sectionId).style.display = 'block';
    
    // ถ้าเปิดหน้าเกลือครั้งแรก และยังไม่มีแถว ให้เพิ่มแถวแรกอัตโนมัติ
    if(sectionId === 'section-salt' && document.getElementById("inputs-container").children.length === 0) {
        addRow();
    }
}

// ฟังก์ชันเพิ่มแถวเครื่องปรุง
function addRow() {
    const div = document.createElement("div");
    div.className = "salt-row";

    let select = document.createElement("select");
    select.className = "salt-select";
    for (let key in sodiumData) {
        let option = document.createElement("option");
        option.text = key;
        option.value = sodiumData[key];
        select.add(option);
    }

    let input = document.createElement("input");
    input.type = "number";
    input.placeholder = "ช้อนชา";
    input.className = "salt-input";
    input.min = "0";
    input.step = "0.5";

    let deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "salt-del-btn";
    deleteBtn.onclick = function() { div.remove(); };

    div.appendChild(select);
    div.appendChild(input);
    div.appendChild(deleteBtn);

    document.getElementById("inputs-container").appendChild(div);
}

// ฟังก์ชันคำนวณโซเดียม
function calculateSodium() {
    let total = 0;
    const rows = document.getElementById("inputs-container").children;

    for (let row of rows) {
        // row.children[0] คือ select, [1] คือ input
        const sodiumPerTsp = row.children[0].value;
        const amount = row.children[1].value;

        if (amount) {
            total += sodiumPerTsp * amount;
        }
    }

    const limit = 2000;
    const percent = ((total / limit) * 100).toFixed(1);

    let message = `โซเดียมรวม: ${total.toFixed(0)} mg<br>`;
    message += `(คิดเป็น ${percent}% ของโควต้าต่อวัน)<br>`;

    if (total > limit) {
        message += "<span style='color:red'>🔴 เกินปริมาณที่แนะนำ!</span>";
    } else {
        message += "<span style='color:green'>🟢 ยังไม่เกินปริมาณที่แนะนำ</span>";
    }

    // แสดงผล
    document.getElementById("result-salt").innerHTML = message;
    
    // เก็บค่าลงตัวแปรซ่อน เตรียมส่งไป Google Sheet
    document.getElementById("final-sodium-mg").value = total;
}

// ฟังก์ชันเริ่มต้นทำงาน Main
async function main() {
    try {
        await liff.init({ liffId: LIFF_ID });
        document.getElementById('status-msg').innerText = "พร้อมใช้งาน ✅";
        
        if (!liff.isLoggedIn()) {
            liff.login();
        }

        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const page = urlParams.get('page');

        if (page === 'bp') showSection('section-bp');
        else if (page === 'salt' || page === 'summary') showSection('section-salt'); 
        else showSection('section-bmi'); 

    } catch (err) {
        document.getElementById('status-msg').innerText = "Error: " + err;
    }
}
main();

// ฟังก์ชันส่งข้อมูล
async function sendData(type) {
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        // อย่าล็อกปุ่มลบแถว หรือปุ่มเพิ่มแถว
        if(btn.className.includes('btn-green') || btn.className.includes('btn-pink') || btn.className.includes('btn-orange')) {
            btn.disabled = true;
            btn.innerText = "⏳ กำลังบันทึก...";
        }
    });

    try {
        const profile = await liff.getProfile();
        let data = { 
            userId: profile.userId, 
            displayName: profile.displayName, 
            type: type 
        };
        let summaryMessage = "";

        // 🟢 กรณี BMI
        if(type === 'bmi') {
            let nameInput = document.getElementById('fullname').value;
            let wInput = document.getElementById('weight').value;
            let hInput = document.getElementById('height').value;

            if(nameInput === "") throw new Error("กรุณาระบุชื่อ-นามสกุล");
            if(wInput === "" || hInput === "") throw new Error("กรุณากรอกข้อมูลให้ครบ");
            
            data.displayName = nameInput; 
            data.weight = parseFloat(wInput);
            data.height = parseFloat(hInput);

            let bmi = data.weight / Math.pow(data.height/100, 2);
            summaryMessage = `📊 BMI บันทึกสำเร็จ!\nชื่อ: ${nameInput}\nBMI: ${bmi.toFixed(2)}`;
        } 
        
        // 🔴 กรณี ความดัน
        else if(type === 'bp') {
            let sys = parseInt(document.getElementById('sys').value);
            let dia = parseInt(document.getElementById('dia').value);
            let pulse = parseInt(document.getElementById('pulse').value);
            
            if(!sys || !dia) throw new Error("กรุณากรอกค่าความดัน");

            data.sys = sys;
            data.dia = dia;
            data.pulse = pulse;
            summaryMessage = `❤️ ความดัน บันทึกสำเร็จ!\nBP: ${sys}/${dia}`;
        }

        // 🟠 กรณี เกลือ (แบบใหม่ คำนวณโซเดียม)
        else if(type === 'salt') {
            let nameInput = document.getElementById('fullname-salt').value;
            
            // ดึงค่าโซเดียมรวมจากตัวแปรซ่อน
            let totalSodium = parseFloat(document.getElementById("final-sodium-mg").value);

            if(nameInput === "") throw new Error("กรุณาระบุชื่อ-นามสกุล");
            
            // ถ้ายังไม่ได้คำนวณ ให้คำนวณก่อน 1 รอบ
            if(totalSodium === 0 && document.getElementById("inputs-container").children.length > 0) {
                 calculateSodium();
                 totalSodium = parseFloat(document.getElementById("final-sodium-mg").value);
            }

            data.displayName = nameInput;
            data.salt = totalSodium; // ส่งค่า mg ไป (ใน Sheet อาจจะเก็บเป็นตัวเลข 2000)

            if (totalSodium <= 2000) {
                summaryMessage = `🧂 บันทึกแล้ว\nโซเดียมรวม: ${totalSodium} mg\n✅ ยังไม่เกินเกณฑ์ที่แนะนำ`;
            } else {
                summaryMessage = `⚠️ บันทึกแล้ว\nโซเดียมรวม: ${totalSodium} mg\n❌ เกินปริมาณที่แนะนำ (2000mg)!`;
            }
        }

        // ส่งข้อมูล
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        alert(summaryMessage);
        liff.closeWindow();

    } catch (err) {
        alert("⚠️ " + err.message);
        // ปลดล็อกปุ่ม
        allButtons.forEach(btn => {
             if(btn.className.includes('btn-green') || btn.className.includes('btn-pink') || btn.className.includes('btn-orange')) {
                btn.disabled = false;
                btn.innerText = "บันทึกข้อมูล";
            }
        });
    }
}