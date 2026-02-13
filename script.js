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
    let detailList = [];
    const rows = document.getElementById("inputs-container").children;

    for (let row of rows) {
        const selectBox = row.children[0];
        const sodiumPerUnit = selectBox.value;
        const name = selectBox.options[selectBox.selectedIndex].text; // ดึงชื่อเครื่องปรุง
        const amount = row.children[1].value;

        if (amount > 0) {
            total += sodiumPerUnit * amount;
            // เก็บชื่อและจำนวนลงตะกร้า เช่น "น้ำปลา x 2"
            detailList.push(`${name} x ${amount}`);
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
    return detailList.join(", ");
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
            let status = "ปกติ ค่า BMI ของท่านอยู่ในเกณฑ์ปกติ ขอให้รับประทานอาหารให้ครบ 5 หมู่ และออกกำลังกายอย่างสม่ำเสมอ เพื่อคงสุขภาพที่ดี";
            if (bmi < 18.5) status = "ผอม ค่า BMI ของท่านต่ำกว่าเกณฑ์ปกติ แนะนำให้ทานอาหารให้ครบมื้อและเพิ่มโปรตีนและติดตามน้ำหนักอย่างสมำ่เสมอ"; 
            else if (bmi >= 23 && bmi < 25) status = "ท้วม ค่า BMI ของท่านสูงกว่าเกณฑ์แนะนำให้ควบคุมอาหาร ลดหวาน มัน และ เค็ม เพิ่มการออกกำลังกายอย่างเหมาะสม เพื่อลดความเสี่ยงโรคความดันโลหิตสูงและโรคเรื่้อรัง ";
            else if (bmi >= 25 && bmi < 30) status = "อ้วน ค่า BMI ของท่านสูงกว่าเกณฑ์แนะนำให้ควบคุมอาหาร ลดหวาน มัน และ เค็ม เพิ่มการออกกำลังกายอย่างเหมาะสม เพื่อลดความเสี่ยงโรคความดันโลหิตสูงและโรคเรื่้อรัง";
            else if (bmi >= 30) status = "อ้วนมาก ค่า BMI ของท่านสูงกว่าเกณฑ์แนะนำให้ควบคุมอาหาร ลดหวาน มัน และ เค็ม เพิ่มการออกกำลังกายอย่างเหมาะสม เพื่อลดความเสี่ยงโรคความดันโลหิตสูงและโรคเรื่้อรัง";


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
            let bpStatus = "ปกติ 🟢 ค่าความดันโลหิตของท่านอยู่ในเกณฑ์ปกติ ขอให้ดูแลสุขภาพอย่าต่อเนืื่อง ลดเค็ม ออกกำลังกายอย่างสม่ำเสมอ พักผ่อนให้เพียงพอ เพื่อลดความเสี่ยงโรคในอนาาคต";
            if (sys >= 140 || dia >= 90) bpStatus = "สูง (ควรระวัง) 🔴 ค่าความดันโลหิตของท่านสูงกว่าปกติแนะนำให้ลดอาหารเค็ม ลดอาหารแปรรูป ออกกำลังกายอย่างสมำ่เสมอ และติดตามวัดความดันอย่างต่อเนื่อง หากยังมีค่าสูงอย่างต่อเนื่อง แนะนำให้รับพบเจ้าหน้าที่สาธารณสุขหรือแพทย์ ";
            else if (sys >= 130 || dia >= 85) bpStatus = "ค่อนข้างสูง 🟠 ค่าความดันโลหิตของท่านค่อนข้างสูงกว่าปกติแนะนำให้ลดอาหารเค็ม ลดอาหารแปรรูป ออกกำลังกายอย่างสมำ่เสมอ และติดตามวัดความดันอย่างต่อเนื่อง หากยังมีค่าสูงอย่างต่อเนื่อง แนะนำให้รับพบเจ้าหน้าที่สาธารณสุขหรือแพทย์ ";
            else if (sys < 90 || dia < 60) bpStatus = "ต่ำ 🟡 ค่าความดันโลหิตของท่านค่อนข้างต่ำ แนะนำให้พักผ่อนให้เพียงพอดื่มน้ำมากขึ้น หากมีอาการเวียนหัว หน้ามือ หรืออ่อนเพลีย กรุณาติดต่อเจ้าหน้าที่สาธารณสุขหรือแพทย์เพื่อประเมินเพิ่มเติม ";
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