FROM python:3.10-slim

# Cài đặt các thư viện hệ thống cần thiết cho OpenCV và MediaPipe
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Copy requirements và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ source code backend
COPY ./backend /code/backend

# Phân quyền cho user để chạy trên Hugging Face Spaces (yêu cầu không chạy dưới quyền root)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Thiết lập thư mục làm việc của user
WORKDIR $HOME/app
COPY --chown=user . $HOME/app

# Hugging Face yêu cầu chạy ở port 7860
EXPOSE 7860

# Lệnh khởi chạy server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
