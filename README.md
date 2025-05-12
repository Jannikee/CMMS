# CMMS Bachelor

Simple overview of use/purpose.Put in later 

## Description

An in-depth paragraph about your project and overview of use. Put in later

## Getting Started

### Dependencies

* Python 3.9+
* Node.js 16+ and npm, if you dont have download and run the installer from [nodejs.org](https://nodejs.org/)
* VS Code

* Git

#### Node installation
* if you dont have download and run the installer from [nodejs.org](https://nodejs.org/)
Setting up Node.js in VSCode

Setting up Node.js in VSCode
1. **Restart VSCode** after installing Node.js

2. **Configure Terminal in VSCode**:
  - Open VSCode Settings (File > Preferences > Settings)
  - Search for "terminal.integrated.defaultProfile"
  - Set it according to your OS:
    - Windows: Set to "Command Prompt" or "PowerShell"
    - macOS/Linux: Set to "bash" or your preferred shell

3. **Install Node.js Extension**:
  - Press Ctrl+Shift+X to open Extensions
  - Search for "Node.js"
  - Install "Node.js Extension Pack" by Microsoft---another namegit checkout <commit-hash>~1 -- path/to/file1 path/to/file2

4. **Verify in VSCode Terminal**:
  - Open a new terminal in VSCode (Terminal > New Terminal)
  - Run `node --version` and `npm --version`
  - If commands still don't work, try closing and reopening VSCode

5. **Manual PATH configuration (if needed)**:
  - In VSCode, go to Settings
  - Search for "terminal.integrated.env"
  - Add settings specific to your OS to include Node.js path:
    - For Windows: 
      ```json
      "terminal.integrated.env.windows": {
          "PATH": "${env:PATH};C:\\Program Files\\nodejs"
      }
      ```
    - Adjust the path if Node.js is installed in a different location

### Backend setup

* Create and activate a Python virtual environment
```
# From the project root
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# OS/Linux:
source venv/bin/activate
```
*  Install Python dependencies
```
pip install -r backend/requirements.txt
```
* Initialize the database
The database initialization is defined in the backend/__init__.py file and should happen automatically when the server starts for the first time
* Run the backend server
```
# From the project root
python server.py
```
Or Ctrl + Shift + d then click the green play button

### Web_app setup
* Install dependencies
```
# From the frontend/web_app directory
cd frontend
cd web_app
npm install
```
* Configure the API URL
Create a .env file in the frontend/web_app directory with the following content:
```
REACT_APP_API_URL=http://localhost:5000/api

```
* Run Web_app
```
# From the frontend/web_app directory
npm start

#Or
npm run build
#then
serve -s build
```
### Mobile_app setup

* Install dependencies
```
# From the frontend/mobile_app directory
cd frontend
cd mobile_app
npm install
```

* Update the API URL 
Open frontend/mobile_app/src/services/api.js and update the API_URL to point to your backend server:
```
// For testing with EXPO on phone
// Use your computer's local network IP address (not localhost), its the last thw two it mentions when you run the backend server
// Make sure both your phone and computer are on the same network
const API_URL = '192.168.1.123:5000/api';  // Replace with your actual local IP
```
* For testing download Expo Go app on phone from your app shop

* Run the mobile application

```
//From the frontend/mobile_app directory
npx expo start
```
* Connect to the Expo app, byt qr code or entering url manually


### Test users

| Username    | Password        | Role       | Description                                      |
|-------------|----------------|------------|--------------------------------------------------|
| admin       | adminpassword  | admin      | Full access to all system features               |
| supervisor  | supervisorpassword | supervisor | Can manage equipment, users, and maintenance plans |
| worker      | workerpassword | worker     | Can perform maintenance tasks and report issues  |

## Built With

### Backend
- **Flask** - Web framework
- **SQLAlchemy** - ORM for database operations
- **Flask-JWT-Extended** - Authentication
- **Pandas** - Data analysis and reporting
- **QRCode** - Equipment identification
- **ReportLab** - PDF report generation

### Web Frontend
- **React** - UI library
- **Ant Design** - UI component library
- **Axios** - HTTP client
- **Recharts** - Data visualization

### Mobile Frontend
- **React Native** - Mobile app framework
- **Expo** - Development platform
- **React Navigation** - Navigation
- **Expo Camera** - QR scanning