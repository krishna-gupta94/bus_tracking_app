import axios from 'axios';
async function run() {
  try {
    const res = await axios.get('http://localhost:5000/api/boarding/export', { headers: { 'Authorization': 'Bearer (not needed if we bypass auth or just test the 401)' }});
    console.log(res.status);
  } catch (e) {
    console.log('Error', e.response?.status, e.response?.data);
  }
}
run();
