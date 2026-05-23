FROM eclipse-temurin:25-jre
RUN apt-get update && apt-get install -y curl wget

WORKDIR /app

# 1. إنشاء المجلدات أولاً لمنع تعليق المسارات
RUN mkdir -p plugins

# 2. أمر موحد ومباشر لتحميل النواة وجميع البلوجنات الـ 17 دفعة واحدة لكسر الكاش
RUN wget -O paper.jar https://fill-data.papermc.io/v1/objects/cfb9281c2657e21ecc8acdaa9efbd6b5b3e873fb5bac4c3b8ba4bba67aa13ee2/paper-26.1.2-65.jar && \
    wget -O plugins/playit.jar https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar && \
    wget -O plugins/LuckPerms.jar https://download.luckperms.net/1563/bukkit/loader/LuckPerms-Bukkit-5.4.151.jar && \
    wget -O plugins/EssentialsX.jar https://github.com/EssentialsX/Essentials/releases/download/2.21.0/EssentialsX-2.21.0.jar && \
    wget -O plugins/EssentialsXChat.jar https://github.com/EssentialsX/Essentials/releases/download/2.21.0/EssentialsXChat-2.21.0.jar && \
    wget -O plugins/WorldGuard.jar https://maven.enginehub.org/repo/com/sk89q/worldguard/worldguard-bukkit/7.1.0-SNAPSHOT/worldguard-bukkit-7.1.0-SNAPSHOT-dist.jar && \
    wget -O plugins/WorldEdit.jar https://maven.enginehub.org/repo/com/sk89q/worldedit/worldedit-bukkit/7.3.10-SNAPSHOT/worldedit-bukkit-7.3.10-SNAPSHOT-dist.jar && \
    wget -O plugins/Chunky.jar https://github.com/pop4959/Chunky/releases/download/1.4.28/Chunky-1.4.28.jar && \
    wget -O plugins/Multiverse-Core.jar https://github.com/Multiverse/Multiverse-Core/releases/download/4.3.1/Multiverse-Core-4.3.1.jar && \
    wget -O plugins/TAB.jar https://github.com/NEZNAMY/TAB/releases/download/v4.1.9/TAB.v4.1.9.jar && \
    wget -O plugins/DecentHolograms.jar https://github.com/DecentSoftware-eu/DecentHolograms/releases/download/2.8.12/DecentHolograms-2.8.12.jar && \
    wget -O plugins/PlaceholderAPI.jar https://github.com/PlaceholderAPI/PlaceholderAPI/releases/download/2.11.6/PlaceholderAPI-2.11.6.jar && \
    wget -O plugins/Vault.jar https://github.com/MilkBowl/Vault/releases/download/1.7.3/Vault.jar && \
    wget -O plugins/ScreamingBedWars.jar https://github.com/ScreamingSandals/ScreamingBedWars/releases/latest/download/ScreamingBedWars.jar && \
    wget -O plugins/AuthMe.jar https://github.com/AuthMe/AuthMeReloaded/releases/download/5.6.0-beta2/AuthMe-5.6.0-beta2-dist.jar && \
    wget -O plugins/Citizens.jar https://nexus.citizensnpcs.co/plugin/download/citizens/latest && \
    wget -O plugins/SkinsRestorer.jar https://github.com/SkinsRestorer/SkinsRestorerX/releases/latest/download/SkinsRestorer.jar && \
    wget -O plugins/HolographicDisplays.jar https://github.com/filoghost/HolographicDisplays/releases/latest/download/HolographicDisplays.jar

# 3. إعدادات السيرفر المكرك الثابتة
RUN echo "eula=true" > eula.txt && \
    echo "online-mode=false" > server.properties

# 4. التشغيل مع كود نفق Playit الأخير الخاص بك وتخصيص الذاكرة المستقر
CMD ["java", "-Xmx1024M", "-Xms1024M", "-Dplayit.secret=982f90ba697a8f4b", "-jar", "paper.jar", "nogui"]
