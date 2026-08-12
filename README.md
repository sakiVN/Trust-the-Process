# Trust-the-Process

> エラー？大丈夫。プロセスを信じれば、きっとうまくいく。

## 🚀 Getting Started

### 1. Clone the repository

Clone the repository and pull the latest branch:

```bash
git clone <URL>
git pull origin <branch-name>
```

> 💡 Alternatively, you can use the **Git / GitHub plugin in VS Code** to clone the repository and switch to the desired branch.

---

### 2. Set up the environment

Create and activate a Python virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
```

Upgrade the required Python tools:

```bash
python -m pip install --upgrade pip setuptools wheel
```

Install the required libraries:

```bash
python -m pip install Django djangorestframework django-cors-headers django-environ pypdf
```

---

### 3. Run the local server

Apply the database migrations:

```bash
python manage.py migrate
```

Start the Django development server:

```bash
python manage.py runserver 8000
```

---

### 4. Open and test the website

Once the server is running, open the following URL in your browser:

👉 **http://127.0.0.1:8000/**

Test the available features and make sure everything works correctly.

---

## 🛠️ Tech Stack

* **Python**
* **Django**
* **Django REST Framework**
* **django-cors-headers**
* **django-environ**
* **pypdf**

---

> 💬 **Trust the Process.**
> エラー？大丈夫。プロセスを信じれば、きっとうまくいく。
