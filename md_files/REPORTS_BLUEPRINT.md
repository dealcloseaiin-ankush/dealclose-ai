# 🚀 DealClose AI - Advanced Reports & Retargeting Blueprint

Yeh document "Advanced Reports" module ka execution plan hai. Iska maqsad business owners ko unke WhatsApp aur Instagram campaigns ki performance ka ek clear view dena hai, aur un leads ko dobara target karne mein madad karna hai jinhone reply nahi kiya ya jinko message fail ho gaya.

---

## 1. Key Features (Kya-Kya Dikhega)

Hum ek naya page **"Reports"** banayenge jismein yeh saari jaankari hogi:

### A. Analytics Dashboard

Yeh dashboard ek table format mein hoga jismein pichle 7, 30, ya 90 din ka data dikhega.

| Metric (Maanak) | WhatsApp | Instagram | Total |
| :--- | :---: | :---: | :---: |
| **Naye Customer Jinhone Message Kiya** | 500 | 1000 | 1500 |
| **Aapke Total Replies (Bot+AI+Staff)** | 450 | 900 | 1350 |
| **Message Successfully Delivered** | 440 (97%) | 850 (94%) | 1290 |
| **Customer Ne Message Padha (Read)** | 400 (90%) | 700 (82%) | 1100 |
| **Message Delivery Fail Ho Gaya** | 10 | 50 | 60 |
| **Customer Ka Reply Aaya** | 300 (66%) | 400 (47%) | 700 |
| **Customer Ne Reply Nahi Kiya** | 150 | 500 | 650 |

### B. Clickable & Actionable Reports

- **Click to View:** Upar di gayi table mein har number (jaise "Message Delivery Fail Ho Gaya" ke neeche '60') **clickable** hoga.
- **Action:** Jab aap '60' par click karenge, toh ek popup mein un 60 logo ki list dikh jayegi jinko message fail hua.

### C. Bulk Retargeting (Sabko Ek Saath Message Bhejna)

- **Select & Send:** Us popup list mein, aap sabhi users ko ek saath select karke unhe ek naya WhatsApp Template ya offer message bhej payenge.
- **Example:** Aap "Customer Ne Reply Nahi Kiya" waale 500 logo ko select karke ek "Special 20% Discount" ka template message bhej sakte hain.

---

## 2. Technical Implementation (Kaise Banega)

1.  **Backend (`leadController.js`):**
    -   `getLeadAnalytics` function ko update karna hoga taaki woh `Message` model se `sent`, `delivered`, `read`, `failed` jaise status ko count kare.
    -   Ek naya API route `/api/leads/report-details?status=failed` banana hoga jo specific users ki list dega.
    -   Ek naya API route `/api/chats/bulk-send` banana hoga jo selected users ko message bhejega.

2.  **Frontend:**
    -   Ek naya page `Reports.jsx` banana hoga jo analytics table dikhayega.
    -   Ek naya component `ReportDrilldownModal.jsx` banana hoga jo user list aur bulk send button dikhayega.

3.  **Database:**
    -   `Message` model mein `status` field pehle se hi hai. Humein bas uspar query karni hai.

---

## 3. Abhi Dashboard Par Kya Dikh Raha Hai?

Abhi hamara main dashboard (`Dashboard.jsx`) `getLeadAnalytics` function se sirf basic data (jaise Total Leads, Converted Leads, Conversion Rate) dikha raha hai. Message delivery se judi detailed report abhi nahi hai. Yeh naya "Reports" page us kami ko poora karega.

---

*Note: Yeh blueprint future development ke liye hai. Isse humein ek clear direction milega.*