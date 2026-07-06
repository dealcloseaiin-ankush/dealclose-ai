# AI Calling Agent - Testing Guide

This document provides a simple guide on how to run and write tests for the backend of this project using Jest.

## 1. Testing Kyun Zaroori Hai? (Why Test?)

Unit tests ek "safety net" (suraksha jaal) ki tarah kaam karte hain. Jab bhi hum code mein koi naya feature add karte hain ya bug fix karte hain, to tests yeh sunishchit karte hain ki purana code kharab na ho.

## 2. Tests Kaise Chalayein? (How to Run Tests)

Tests chalane ke liye, `backend` directory ke andar terminal mein neeche di gayi command likhein.

### Saare Tests Ek Saath Chalana

Yeh command project ke saare `.test.js` files ko dhoondh kar chala degi. Code push karne se pehle yeh hamesha chalana chahiye.

```bash
npx jest
```

### Sirf Ek File Ko Test Karna

Development ke dauraan, agar aap sirf ek file (jaise `crmController`) par kaam kar rahe hain, to aap sirf uske tests chala kar samay bacha sakte hain.

```bash
npx jest crmController.test.js
```

## 3. Naya Test Kaise Likhein? (How to Write a New Test)

Naya test likhna aasan hai. In steps ko follow karein:

1.  **File Structure:** Jis file ko test karna hai (e.g., `myController.js`), uske liye usi folder mein ek nayi file `myController.test.js` banayein.

2.  **Dependencies Mock Karein:** Test file ke shuru mein, saare database models aur external services ko `jest.mock()` ka istemaal karke mock karein. Isse test asli database ya external API ko call nahi karega.

    ```javascript
    // myController.test.js
    const User = require('../models/userModel');
    const aiService = require('../services/aiService');
    
    jest.mock('../models/userModel'); // Model ko mock kiya
    jest.mock('../services/aiService'); // Service ko mock kiya
    ```

3.  **Test Cases Likhein:** `describe` block ke andar `it` block ka istemaal karke alag-alag scenarios (jaise success case, failure case) ke liye test likhein.

    ```javascript
    describe('My Controller - myFunction', () => {
      it('should do something correctly on success', async () => {
        // Test logic yahan likhein
      });
    
      it('should return an error on failure', async () => {
        // Error case ka logic yahan likhein
      });
    });
    ```

Is guide se aapko hamesha testing ka process saaf aur aasan lagega.