# 动作音效与 Sound Skill

浙大猫学长的演示先用卡片出现引出节奏，再用波形和不同声音说明音色。约 02:48–03:05 用同一组产品界面动画和下方 A/B 波形对照配声，约 03:15 后展示不同来源的开关声音。可借用的做法是固定画面、动作点和试听音量，每次只换一个声音，比较哪一个更像那个动作。[《Sound Skill》抖音原片](https://www.douyin.com/video/7702007022564183336)

## 从画面到声音

1. 先定**什么时间响**。给标题到位、卡片落位、按键触发、转场经过或结果出现标帧。撞击、落位和开关用波形的起音对齐目标帧，扫过声的峰值可贴近速度峰值。一个音效文件可能有开头静音，检视波形后再放。
2. 再定**像什么**。照着画面写「动作、材质、力度、空间、目标时长」，据此拼成英文查询。纸卡落桌可以找 `soft paper tap`，UI 键可以找 `soft tactile button click`。真实物件、合成音和游戏音根据镜头质感选。
3. 候选按相关度、时长和许可证筛。下载量和评分人数用于排序，排序后还要播在画面上。用相同剪辑和相近听感音量试听 A/B，把需要回收的尾音留到下一个关键声之前。
4. 对照原有旁白、配乐和留白。关键动作留少量声音，听清首字和数字。复核动作之前、接触帧和尾音落点，并记音效链接、创作者和许可。需要整体混音时沿用 [渲染、配乐和验收](production.md) 的流程。

## 调用公开版

如需找素材，从 [vibe-motion/sound](https://github.com/vibe-motion/sound/tree/14301fe85f71349b5ec887098504dd25a5a596fc) 取公开版，读 `SKILL.md` 和 `README.md`，通过 Python 单独运行 `scripts/sfx.py`。公开检出的命令支持 Freesound 的搜索与 MP3 预览下载。视频里演示了多音效库策略，发布说明中的生成与混音能力属于另外的版本。[官方 README](https://github.com/vibe-motion/sound/blob/14301fe85f71349b5ec887098504dd25a5a596fc/README.md)

```sh
python "<sound-skill-dir>/scripts/sfx.py" freesound "soft whoosh" --license cc0 --pages 1 -n 3 --urls
python "<sound-skill-dir>/scripts/sfx.py" get "<project>/sfx" "fs:<本次搜索返回的ID>"
```

`get` 读取前一次搜索保存的索引，使用同一个缓存。需要署名时按具体音效页的许可保留所需信息。在 2026 年 11 月 27 日的调用中，公开版查询返回了三个候选，并从同一索引下载了 `fs:71852` 的 CC0 预览，FFprobe 读取约 0.95 秒。这个结果用于验证检索和下载。正式剪辑时还要按具体镜头取舍，例如短促卡片落位可继续找更短、带清楚起音的材料。[Freesound 音效页](https://freesound.org/s/71852/)
