const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ganti dengan URL API Google Apps Script yang sudah Anda buat
const apiUrl = 'https://script.google.com/macros/s/AKfycbyfxy5m-tHKjnRBqKz12mUnIPjcChnnyIyYvEt8PhsRh5w6bdmls-SUVel3rlB-fMCHTQ/exec';

// Fungsi untuk menghapus file jika ada
function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath); // Menghapus file
    console.log(`File ${filePath} telah dihapus`);
  }
}

async function fetchUrlsAndTest() {
  try {
    // Hapus file url.json jika sudah ada
    const urlFilePath = path.join(__dirname, 'url.json');
    deleteFileIfExists(urlFilePath);

    // Mengambil data URL dari Google Apps Script API
    const response = await axios.get(apiUrl);
    const urlList = response.data; // Data list produk dan URL dari API

    // Menyimpan data URL ke file url.json
    fs.writeFileSync(urlFilePath, JSON.stringify(urlList, null, 2));
    console.log('Data produk dan URL berhasil disimpan ke url.json');

    // Variabel untuk laporan
    let totalUrls = urlList.length;
    let totalGreen = 0;
    let totalRed = 0;
    let totalMaintenance = 0;
    let redUrls = []; // Array untuk menyimpan URL yang bermasalah (Red)

    // Melakukan pengujian pada setiap URL
    for (const item of urlList) {
      const { product, url } = item; // Ambil produk dan URL dari item

      // Menambahkan awalan jika URL tidak dimulai dengan http:// atau https://
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;

      try {
        // Menguji URL dan mengikuti pengalihan secara otomatis
        const urlResponse = await axios.get(fullUrl, { 
            timeout: 5000, // Timeout 5 detik
            validateStatus: (status) => status >= 200 && status < 400, // Validasi status untuk 200 dan 300
            maxRedirects: 0 // Nonaktifkan pengalihan otomatis
        });

        // Memeriksa status dari bagian "Network -> Doc"
        const docStatus = urlResponse.status; // Menggunakan status dari respons

        // Cek status code untuk menentukan status
        if (docStatus >= 200 && docStatus < 400) {
          if (urlResponse.data.includes('maintained')) { 
            console.log(`[${product}]: ${fullUrl} - Maintenance detected`);
            totalMaintenance++;
          } else {
            console.log(`[${product}]: ${fullUrl} - Green`);
            totalGreen++;
          }
        } else {
          console.log(`[${product}]: ${fullUrl} - Red (Status: ${docStatus})`);
          totalRed++;
          redUrls.push({ product, url: fullUrl, status: docStatus }); // Menyimpan URL yang bermasalah
        }

      } catch (error) {
        console.log(`[${product}]: ${fullUrl} - Red (Error: ${error.message})`);
        totalRed++;
        redUrls.push({ product, url: fullUrl, error: error.message }); // Menyimpan URL yang gagal
      }
    }

    // Menyimpan laporan ke file report.json
    const report = {
      totalUrls,
      totalGreen,
      totalRed,
      totalMaintenance,
      redUrls // Menyimpan list URL yang bermasalah
    };

    const reportFilePath = path.join(__dirname, 'reports', 'report.json');
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
    console.log('Laporan pengujian berhasil disimpan ke reports/report.json');

  } catch (error) {
    console.error('Error fetching URL data:', error);
  }
}

fetchUrlsAndTest();

