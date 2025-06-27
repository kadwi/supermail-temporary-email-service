
Built by https://www.blackbox.ai

---

# SuperMail Temporary Email Service

## Project Overview
SuperMail is a modern temporary email service built using **Node.js**, **IMAP**, **Redis**, and **TailwindCSS**. It allows users to create temporary email addresses for receiving emails without the hassle of creating a permanent email account. This project focuses on providing a simple and straightforward user experience while leveraging the capabilities of modern web technologies.

## Installation
To get started with SuperMail, follow the steps below:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/supermail-temp-mail.git
   ```

2. **Navigate to the project directory**:
   ```bash
   cd supermail-temp-mail
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set environment variables**:
   Create a `.env` file in the root directory and set the following variables:
   ```
   ADMIN_USER=your_admin_username
   ADMIN_PASSWORD=your_admin_password
   TEMP_MAIL_DOMAIN=your_temp_mail_domain
   PORT=3000  # Optional: If you want to change the default port
   ```

5. **Build the CSS files**:
   To build the TailwindCSS styles, run:
   ```bash
   npm run build:css
   ```

6. **Start the application**:
   To run the server, use:
   ```bash
   npm start
   ```

## Usage
- Visit `http://localhost:3000` in your web browser to access the application.
- You can create a temporary email to receive messages.
- For admin access, navigate to `http://localhost:3000/admin`, where you will need to enter the admin credentials you set in the `.env` file.

## Features
- **Temporary Email Generation**: Create temporary email addresses that can be used to receive emails.
- **Admin Dashboard**: An admin area that requires authentication, where admins can manage the email service.
- **Responsive Design**: Built with TailwindCSS for a sleek and responsive user interface.
- **Error Handling**: Includes proper error handling for user-friendliness.

## Dependencies
The following are the key dependencies used in the project:

- **dotenv**: For managing environment variables.
- **ejs**: For rendering HTML pages with embedded JavaScript.
- **express**: Web framework for building the application.
- **node-imap**: For connecting and interacting with the IMAP email protocol.
- **redis**: For in-memory data storage and caching.

To install the required dependencies run:
```bash
npm install
```

## Project Structure
```
supermail-temp-mail/
├── node_modules/              # Project dependencies
├── public/                    # Static files (CSS, JS, images, etc.)
│   └── css/                   # Compiled TailwindCSS file
├── routes/                    # API routes
│   └── api.js                 # API endpoint definitions
├── views/                     # EJS templates for rendering HTML
│   ├── admin.ejs              # Admin dashboard view
│   ├── index.ejs              # Main page view
│   ├── 404.ejs                # 404 error page view
│   └── ...                    # Other views
├── .env                       # Environment config file (to be created)
├── package.json               # Project metadata and dependencies
└── server.js                  # Entry point for the application
```

## Conclusion
SuperMail provides a simple and effective way to generate temporary email addresses for receiving emails. Its use of Node.js, IMAP, Redis, and TailwindCSS ensures a robust and performant service that can easily be extended with new features.