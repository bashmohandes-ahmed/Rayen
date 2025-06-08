# Rayen
# rayen - Integrated E-Commerce Platform

**rayen** is an open-source project for a full-featured e-commerce platform supporting customer and seller registration, product listing and purchasing, reviews and comments, and basic admin management.  
The project is designed for easy setup and modern Arabic interface, and serves as a solid foundation for any custom marketplace, especially for Egyptian or Arabic markets.

---

## Main Features

- **Customer & Seller Registration:**  
  Users can register as either customers or sellers. Sellers are required to upload a national ID photo and a personal photo. Their data is automatically sent to the admin’s email for review.

- **Product Management:**  
  Sellers can add products with multiple images and a mandatory video. Products remain in "pending review" status until approved by the admin.

- **Product Details Page:**  
  On viewing a product, all product images, the product video, average rating, and customer comments are displayed.

- **Ratings & Comments:**  
  Any customer who purchased a product can rate and comment. All reviews are visible to everyone.

- **Purchasing & Payment:**  
  Buyers can purchase products by choosing a payment method (Visa or Cash on Delivery) and entering their address.

- **Admin Notifications:**  
  Admin receives an email notification whenever a new seller registers, including all details and images.

- **Order Tracking:**  
  New orders are visible to the seller (for their products), the customer, and the admin.

- **Modern Arabic UI:**  
  The interface is responsive, attractive, and fully supports Arabic.

---

## Technical Requirements

- Node.js 18+
- MongoDB
- Gmail account (for notifications—App Password required)

---

## Quick Start

1. Install dependencies:
   ```
   npm install
   ```
2. Create the following directories for image and video uploads (inside your project folder):
   ```
   uploads/idcards
   uploads/profiles
   uploads/products/images
   uploads/products/videos
   ```
3. Edit the email and password variables at the top of `server.js`.
4. Start the server:
   ```
   node server.js
   ```
5. Open the site at `http://localhost:5000`

---

## Main Folders & Files

- `server.js` : All back-end and API logic.
- `public/index.html` : Main front-end homepage.
- `public/styles.css` : Modern CSS for the front-end.

---

## Notes

- All new seller data is automatically sent to the admin’s email for review.
- You must use a [Gmail App Password](https://myaccount.google.com/apppasswords) for sending emails.
- You can develop the front-end with any framework (React, Vue, etc.), or use the provided HTML/CSS files directly.

---

## License

rayen is open-source and free to use or modify for non-commercial or educational purposes.

---

**Good luck with your project!**
