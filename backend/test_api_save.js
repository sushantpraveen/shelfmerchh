const fs = require('fs');
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000/api';
const EMAIL = 'tester@shelfmerch.com';
const PASSWORD = 'Password@123';
const STORE_SLUG = 'tester-store';

async function testMultipleSaves() {
  const results = {
    steps: [],
    finalResult: null,
    error: null
  };
  
  try {
    console.log('--- Starting API Verification (Results will be in test_results.json) ---');
    
    // 1. Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    }, { timeout: 10000 });
    const token = loginRes.data.token;
    results.steps.push({ step: 'login', success: true });
    
    const config = {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Host': `${STORE_SLUG}.localhost`
      },
      timeout: 10000
    };
    
    // 2. Get a catalog product
    const catalogRes = await axios.get(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    const catalogProducts = catalogRes.data.data;
    if (!catalogProducts || catalogProducts.length === 0) {
      throw new Error('No catalog products found to test with.');
    }
    const catProd = catalogProducts[0];
    results.steps.push({ step: 'get_catalog', success: true, productName: catProd.name, productId: catProd._id });
    
    // 3. Save first listing
    const payload1 = {
      catalogProductId: catProd._id,
      sellingPrice: 1000,
      title: 'First Listing',
      description: 'First listing description',
      status: 'published',
      variants: [] 
    };
    
    const save1Res = await axios.post(`${API_URL}/store-products`, payload1, config);
    const id1 = save1Res.data.data?._id || save1Res.data.data?.id;
    results.steps.push({ step: 'save1', success: true, id: id1, data: save1Res.data });
    
    // 4. Save second listing (SAME catalogProductId, DIFFERENT title)
    const payload2 = {
      catalogProductId: catProd._id,
      sellingPrice: 1200,
      title: 'Second Listing',
      description: 'Second listing description',
      status: 'published',
      variants: []
    };
    
    const save2Res = await axios.post(`${API_URL}/store-products`, payload2, config);
    const id2 = save2Res.data.data?._id || save2Res.data.data?.id;
    results.steps.push({ step: 'save2', success: true, id: id2, data: save2Res.data });
    
    if (id1 === id2) {
      results.finalResult = 'FAIL_IDENTICAL_IDS';
    } else {
      results.finalResult = 'SUCCESS_DIFFERENT_IDS';
    }
    
  } catch (error) {
    results.error = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  } finally {
    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
    console.log('Results written to test_results.json');
  }
}

testMultipleSaves();
