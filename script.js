// ==========================================
// ⚙️ ตั้งค่าระบบ (ใช้ ID เดิมของคุณ)
const LIFF_ID = "2008799065-MIMzWyU2"; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxH-L9hC1ta73oyBt0VeXWloEWt4sgBC7y--iVsql51dcUJOeJFKfEg0pO6nBDGxGpj/exec";
// ==========================================

// ฟังก์ชันสลับหน้าจอ
function showSection(sectionId) {
    document.getElementById('section-bmi').style.display = 'none';
    document.getElementById('section-bp').style.display = 'none';
    document.getElementById('section-summary').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';
}

// ฟังก์ชันเริ่มต้นทำงาน
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
        else if (page === 'summary') showSection('section-summary');
        else showSection('section-bmi'); 

    } catch (err) {
        document.getElementById('status-msg').innerText = "Error: " + err;
    }
}
main();

// ฟังก์ชันส่งข้อมูล
async function sendData(type) {
    // 1. ล็อกปุ่มทันที
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.innerText = "⏳ กำลังตรวจสอบ...";
    });

    try {
        // ดึงข้อมูลพื้นฐานจาก LIFF
        const profile = await liff.getProfile();
        
        let data = { 
            userId: profile.userId, 
            displayName: profile.displayName, // ค่าเริ่มต้นเอาชื่อไลน์มาก่อน
            type: type 
        };
        
        let summaryMessage = "";

        // ==========================================
        // 🟢 กรณีบันทึก BMI (มีช่องกรอกชื่อเพิ่ม)
        // ==========================================
        if(type === 'bmi') {
            // รับค่าจากช่องกรอก
            let nameInput = document.getElementById('fullname').value; // <--- รับชื่อที่กรอกเอง
            let wInput = document.getElementById('weight').value;
            let hInput = document.getElementById('height').value;

            // ตรวจสอบข้อมูล (Validation)
            if(nameInput === "") throw new Error("กรุณาระบุ 'ชื่อ-นามสกุล' ผู้ตรวจด้วยครับ");
            if(wInput === "" || hInput === "") throw new Error("กรุณากรอกทั้งน้ำหนักและส่วนสูง");
            
            let w = parseFloat(wInput);
            let h = parseFloat(hInput);

            if(w <= 0 || h <= 0) throw new Error("ค่าต้องมากกว่า 0");
            if(h < 50 || h > 300) throw new Error("ส่วนสูงผิดปกติ");

            // ✅ บันทึกข้อมูล (ใช้ชื่อที่กรอกเอง ทับชื่อไลน์ไปเลย)
            data.displayName = nameInput; 
            data.weight = w;
            data.height = h;

            // คำนวณ BMI
            let bmi = w / Math.pow(h/100, 2);
            let status = "ปกติ";
            if (bmi < 18.5) status = "ผอม";
            else if (bmi >= 23 && bmi < 25) status = "ท้วม";
            else if (bmi >= 25 && bmi < 30) status = "อ้วน";
            else if (bmi >= 30) status = "อ้วนมาก";

            summaryMessage = `📊 BMI บันทึกสำเร็จ!\n----------------\nชื่อ: ${nameInput}\nนน: ${w} | สูง: ${h}\nBMI: ${bmi.toFixed(2)}\nผล: ${status}`;
        } 
        
        // ==========================================
        // 🔴 กรณีบันทึก ความดัน
        // ==========================================
        else if(type === 'bp') {
            let sysInput = document.getElementById('sys').value;
            let diaInput = document.getElementById('dia').value;
            let pulseInput = document.getElementById('pulse').value;

            if(sysInput === "" || diaInput === "" || pulseInput === "") throw new Error("กรุณากรอกให้ครบทุกช่อง");

            let sys = parseInt(sysInput);
            let dia = parseInt(diaInput);
            let pulse = parseInt(pulseInput);

            if(sys <= 0 || dia <= 0 || pulse <= 0) throw new Error("ค่าต้องมากกว่า 0");
            if(sys > 300 || dia > 200) throw new Error("ค่าสูงเกินจริง");

            data.sys = sys;
            data.dia = dia;
            data.pulse = pulse;

            let bpStatus = "ปกติ 🟢";
            if (sys >= 140 || dia >= 90) bpStatus = "สูง (ควรระวัง) 🔴";
            else if (sys >= 130 || dia >= 85) bpStatus = "ค่อนข้างสูง 🟠";
            else if (sys < 90 || dia < 60) bpStatus = "ต่ำ 🟡";

            summaryMessage = `❤️ ความดัน บันทึกสำเร็จ!\n----------------\nBP: ${sys}/${dia}\nชีพจร: ${pulse}\nผล: ${bpStatus}`;
        }

        // 2. ส่งข้อมูลไป Google Sheets
        document.getElementById('status-msg').innerText = "กำลังบันทึกข้อมูล...";
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // 3. แจ้งเตือนสำเร็จ
        alert(summaryMessage);
        liff.closeWindow();

    } catch (err) {
        alert("⚠️ " + err.message);
        
        allButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.innerText = "บันทึกข้อมูล";
        });
        document.getElementById('status-msg').innerText = "";
    }
}