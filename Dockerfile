# استخدام نسخة جافا 8 المستقرة للسيرفرات القديمة
FROM openjdk:8-jre-slim

# تثبيت أداة wget لتحميل الملفات من الإنترنت
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# تحديد مجلد العمل
WORKDIR /minecraft-retro

# نسخ الملفات النصية والإعدادات (مثل eula و server.properties) من الـ GitHub
COPY . .

# 1. تحميل ملف تشغيل السيرفر (PaperSpigot 1.8.8) تلقائياً
RUN wget -O server.jar https://api.papermc.io/v2/projects/paper/versions/1.8.8/builds/445/downloads/paper-1.8.8-445.jar

# إنشاء مجلد البلجنات
RUN mkdir -p plugins

# 2. تحميل بلجن إلغاء الكول داون وإرجاع القتال القديم (OldCombatMechanics)
RUN wget -O plugins/OldCombatMechanics.jar https://github.com/kernkraftritter/OldCombatMechanics/releases/download/v1.12.1/OldCombatMechanics.jar

# فتح منفذ الاتصال الخاص بماين كرافت
EXPOSE 25565

# أمر التشغيل المعتمد بالسيرفر
CMD ["java", "-Xms1G", "-Xmx1G", "-jar", "server.jar", "nogui"]
