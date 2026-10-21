/* =============================================================================
 * 人员数据 — 星光圣域
 * -----------------------------------------------------------------------------
 * 名单不再写死在 HTML 里；等级页 / 人员档案首页都从这里读数据渲染。
 * 加成员：往 members 里追加一项（class 用 sxm / sam / sfm / spm），
 * 等级页和首页人数会自动更新。没写身份编号的，anchor 用 pending-拉丁名。
 * 成员字段：class, anchor, identity, name, latin, gender, birth, race, fleet,
 *           residenceLabel, residence, roles[], relatives[], awards[], research[],
 *           feedback[]。空字段渲染成「资料待补」。
 * relatives[] 里的「关系：姓名」如果姓名在本库存在，会自动链到对方档案。
 * 注意：这是站点数据，不是资料库本体；资料库改完后把对应条目同步到这里。
 * ========================================================================== */
window.SSS_PERSONNEL = {
  "classes": [
    {
      "key": "sxm",
      "code": "SXM",
      "name": "管理成员",
      "en": "SSS Administrative Member",
      "desc": "星光圣域的人员，拥有最高的授权等级。"
    },
    {
      "key": "sam",
      "code": "SAM",
      "name": "高级成员",
      "en": "SSS Advanced Member",
      "desc": "星光圣域的人员，拥有较高的授权等级。"
    },
    {
      "key": "sfm",
      "code": "SFM",
      "name": "正式成员",
      "en": "SSS Formal Member",
      "desc": "星光圣域的人员。"
    },
    {
      "key": "spm",
      "code": "SPM",
      "name": "预备成员",
      "en": "SSS Preparatory Member",
      "desc": "近期加入星光圣域的人员。"
    }
  ],
  "members": [
    {
      "class": "sxm",
      "anchor": "30101410102731530",
      "identity": "30101410102731530",
      "name": "阿莱克西·伊蒙宁",
      "latin": "Aleksei Immonen",
      "gender": "男",
      "birth": "410/10/27",
      "race": "人类",
      "fleet": "主防御舰队",
      "residenceLabel": "居住地",
      "residence": "主防御舰队 - 星辰方舟 - 主居住区 - 第1居住群 - 1204961",
      "roles": [
        "星光圣域规划部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [
        "第1届星光圣域军事演练优胜方指挥官",
        "第2届星光圣域军事演练优胜方指挥官",
        "第3届星光圣域军事演练优胜方指挥官"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "30101376061294034",
      "identity": "30101376061294034",
      "name": "爱丽丝·格林希尔",
      "latin": "Alice Greenhill",
      "gender": "女",
      "birth": "376/6/12",
      "race": "萨仰德特",
      "fleet": "主防御舰队",
      "residenceLabel": "居住地",
      "residence": "主防御舰队 - 星辰方舟 - 主居住区 - 第2居住群 - 3511051",
      "roles": [
        "星光圣域舰队后勤部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [
        "第2届星光圣域军事演练优胜方指挥官",
        "第4届星光圣域军事演练优胜方指挥官"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "10101347060759797",
      "identity": "10101347060759797",
      "name": "阿斯特莱雅·阿莉茜娅",
      "latin": "Astraea Alicia",
      "gender": "女",
      "birth": "374/6/7",
      "race": "凯斯特莉娅",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 落星峡居住区 - 第1居住群 - 第9居住建筑 - 309",
      "roles": [
        "星光圣域经济部 部长"
      ],
      "relatives": [
        "养女：余事星空",
        "养女：余事月夜"
      ],
      "awards": [
        "星光圣域历史文件归档测速第1名",
        "星光圣域第2届综合科研水平比赛第7名",
        "星光圣域第3届综合科研水平比赛第8名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "10101389123084265",
      "identity": "10101389123084265",
      "name": "奥雷里奥·“星”·格洛瑞亚",
      "latin": "Aurelio \"Star\" Gloria",
      "gender": "男",
      "birth": "389/12/30",
      "race": "阿斯特莱雅",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 落星峡居住区 - 第1居住群 - 第9居住建筑 - 308",
      "roles": [
        "星光圣域情报部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [
        "第1届星光圣域历史比赛第2名",
        "第3届星光圣域综合科研比赛第5名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "pending-donato-vojic",
      "identity": "",
      "name": "多纳托·沃伊奇",
      "latin": "Donato Vojic",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-edmund-eric-hythia",
      "identity": "",
      "name": "埃德蒙·埃里克·希斯亚",
      "latin": "Edmund Eric Hythia",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "科研总局 局长"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-ilisaria-clea",
      "identity": "",
      "name": "伊利莎丽娅·克利娅",
      "latin": "Ilisaria Clea",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域收集部 副部长"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "20202402020220202",
      "identity": "20202402020220202",
      "name": "约翰·布什·欧若拉",
      "latin": "John Bush Aurora",
      "gender": "男",
      "birth": "402/02/02",
      "race": "长生者",
      "fleet": "工业与收集舰队",
      "residenceLabel": "居住地",
      "residence": "工业与收集舰队 - 星辰方舟2号 - 收缩居住区 - 第2居住群 - 第7居住建筑 - 203",
      "roles": [
        "星光圣域工业部 副部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-khariton-kaganovich-naumov",
      "identity": "",
      "name": "哈里顿·卡冈诺维奇·纳乌莫夫",
      "latin": "Khariton Kaganovich Naumov",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "元帅"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "10101390011232123",
      "identity": "10101390011232123",
      "name": "科迪·冯·兰德马克",
      "latin": "Kody von Landmark",
      "gender": "女",
      "birth": "390/01/12",
      "race": "阿维兰",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 落星峡居住区 - 第1居住群 - 第9居住建筑 - 311",
      "roles": [
        "星光圣域科研部 副部长"
      ],
      "relatives": [],
      "awards": [
        "星光圣域第1届综合科研水平比赛第1名",
        "星光圣域第2届综合科研水平比赛第1名",
        "星光圣域第3届综合科研水平比赛第1名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "20301392010247001",
      "identity": "20301392010247001",
      "name": "李重明",
      "latin": "Li Chongming",
      "gender": "男",
      "birth": "392/1/2",
      "race": "赫苍保费",
      "fleet": "工业与收集舰队",
      "residenceLabel": "居住地",
      "residence": "工业与收集舰队 - 星辰方舟3号 - 轻能居住区 - 第1居住群 - 2407",
      "roles": [
        "星光圣域收集部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [
        "星光圣域第1届综合科研水平竞赛第5名",
        "星光圣域第2届综合科研水平竞赛第4名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "10102416081731753",
      "identity": "10102416081731753",
      "name": "洛璃",
      "latin": "Luo Li",
      "gender": "女",
      "birth": "416/8/17",
      "race": "萨仰德特",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 映月湾居住区 - 第3居住群 - 第1居住建筑 - 606",
      "roles": [
        "星光圣域外交部 部长"
      ],
      "relatives": [],
      "awards": [
        "星光圣域第7届语言竞赛第1名",
        "星光圣域第8届语言竞赛第1名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "30101387062015736",
      "identity": "30101387062015736",
      "name": "娜奥米·凯恩",
      "latin": "Naomi Kane",
      "gender": "女",
      "birth": "387/6/20",
      "race": "凯斯特莉娅",
      "fleet": "主防御舰队",
      "residenceLabel": "居住地",
      "residence": "主防御舰队 - 星辰方舟 - 主居住区 - 第1居住群 - 1038914",
      "roles": [
        "星光圣域战术战略部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [
        "第1届星光圣域军事演练优胜方指挥官",
        "第3届星光圣域军事演练优胜方指挥官"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "pending-nguyen-van-an",
      "identity": "",
      "name": "阮文恩",
      "latin": "Nguyen Van An",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域管理部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-pyotr-ivanov-ivanovia",
      "identity": "",
      "name": "彼得·伊万诺夫·伊万诺维亚",
      "latin": "Pyotr Ivanov Ivanovia",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "科研总局 副局长"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-saman-vojic",
      "identity": "",
      "name": "莎曼·沃伊奇",
      "latin": "Saman Vojic",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-shao-manyi",
      "identity": "",
      "name": "韶曼易",
      "latin": "Shao Manyi",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域教育部 部长"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-shingo-hosoyama",
      "identity": "",
      "name": "细山真吾",
      "latin": "Shingo Hosoyama",
      "gender": "资料待补",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域资料部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "10101383030171669",
      "identity": "10101383030171669",
      "name": "斯科涅·兰·斯尔德里亚",
      "latin": "Skone Lan Silderia",
      "gender": "男",
      "birth": "383/3/1",
      "race": "欧雅法斯",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 落星峡居住区 - 第1居住群 - 第10居住建筑 - 1904",
      "roles": [
        "星光圣域调查部 部长"
      ],
      "relatives": [],
      "awards": [
        "第1届星光圣域历史比赛第1名",
        "第2届星光圣域历史比赛第3名",
        "星光圣域第4届综合科研水平比赛第3名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "pending-travis-augustson",
      "identity": "",
      "name": "特拉维斯·奥古斯特森",
      "latin": "Travis Augustson",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "主防御舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域战术战略部 副部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-viola-fons",
      "identity": "",
      "name": "薇奥拉·丰斯",
      "latin": "Viola Fons",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-vivian-stahl",
      "identity": "",
      "name": "薇薇安·斯达尔",
      "latin": "Vivian Stahl",
      "gender": "资料待补",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域后勤部 部长",
        "星光圣域管理成员议会 议员"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "pending-william-stirling",
      "identity": "",
      "name": "威廉·斯特林",
      "latin": "William Stirling",
      "gender": "资料待补",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [
        "星光圣域生命部 部长"
      ],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sxm",
      "anchor": "10101389110909795",
      "identity": "10101389110909795",
      "name": "余事星空",
      "latin": "Yuusi Hoshizora",
      "gender": "女",
      "birth": "389/11/9",
      "race": "斯凯特莉娅",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟1号 - 落星峡居住区 - 第1居住群 - 第9居住建筑 - 309",
      "roles": [
        "星光圣域科研部 部长",
        "星光圣域管理成员议会 议员",
        "星光圣域阿斯蒂芬联合会 会长"
      ],
      "relatives": [
        "养母：阿斯特莱雅·阿莉茜娅",
        "妹：余事月夜"
      ],
      "awards": [
        "星光圣域第1届综合科研水平比赛第2名",
        "星光圣域第2届综合科研水平比赛第2名",
        "星光圣域第3届综合科研水平比赛第2名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sxm",
      "anchor": "20101389110909799",
      "identity": "20101389110909799",
      "name": "余事月夜",
      "latin": "Yuusi Tsukiyo",
      "gender": "女",
      "birth": "389/11/9",
      "race": "斯凯特莉娅",
      "fleet": "工业与收集舰队",
      "residenceLabel": "居住地",
      "residence": "工业与收集舰队 - 星辰方舟1号 - 柯兰德利尔居住区 - 第1居住群 - 第2居住建筑 - 604",
      "roles": [
        "星光圣域工业部 部长",
        "星光圣域管理成员议会 议员",
        "星光圣域阿斯蒂芬联合会 副会长"
      ],
      "relatives": [
        "养母：阿斯特莱雅·阿莉茜娅",
        "姐：余事星空"
      ],
      "awards": [
        "星光圣域第1届综合科研水平比赛第3名",
        "星光圣域第2届综合科研水平比赛第3名",
        "星光圣域第3届综合科研水平比赛第3名",
        "星光圣域第4届综合科研水平比赛第1名"
      ],
      "research": [
        "此项目保密。"
      ],
      "feedback": [
        "此项目保密。"
      ]
    },
    {
      "class": "sam",
      "anchor": "pending-ellis-scott",
      "identity": "",
      "name": "埃利斯·斯科特",
      "latin": "Ellis Scott",
      "gender": "男",
      "birth": "资料待补",
      "race": "星域人",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "20201403050115742",
      "identity": "20201403050115742",
      "name": "汉斯·冯·阿兰爱特",
      "latin": "Hans von Aranait",
      "gender": "男",
      "birth": "403/5/1",
      "race": "人类",
      "fleet": "工业与收集舰队",
      "residenceLabel": "居住地",
      "residence": "工业与收集舰队 - 星辰方舟2号 - 集束居住区 - 第4居住群 - 第1居住建筑 - 202",
      "roles": [
        "星光圣域采矿第4团 团长"
      ],
      "relatives": [
        "弟弟：斯柯达·冯·阿兰爱特"
      ],
      "awards": [
        "星光圣域第5届采矿团竞赛第1名领导人"
      ],
      "research": [
        "高效采矿器"
      ],
      "feedback": [
        "此人为星光圣域模范成员，无任何不良习惯。"
      ]
    },
    {
      "class": "sam",
      "anchor": "pending-ireland-scott",
      "identity": "",
      "name": "爱尔兰德·斯科特",
      "latin": "Ireland Scott",
      "gender": "女",
      "birth": "资料待补",
      "race": "星域人",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "pending-john-altray",
      "identity": "",
      "name": "约翰·阿尔特雷",
      "latin": "John Altray",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "pending-kelsey-lorenwood",
      "identity": "",
      "name": "凯尔希·洛伦伍德",
      "latin": "Kelsey Lorenwood",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "pending-kong-heyun",
      "identity": "",
      "name": "空和韵",
      "latin": "Kong Heyun",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "pending-li-jiaming",
      "identity": "",
      "name": "李嘉明",
      "latin": "Li Jiaming",
      "gender": "男",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "20201403050115741",
      "identity": "20201403050115741",
      "name": "斯柯达·冯·阿兰爱特",
      "latin": "Skoda von Aranait",
      "gender": "男",
      "birth": "403/5/1",
      "race": "人类",
      "fleet": "工业与收集舰队",
      "residenceLabel": "居住地",
      "residence": "工业与收集舰队 - 星辰方舟2号 - 集束居住区 - 第4居住群 - 第1居住建筑 - 201",
      "roles": [
        "星光圣域采矿第4团 副团长"
      ],
      "relatives": [
        "兄：汉斯·冯·阿兰爱特"
      ],
      "awards": [
        "星光圣域第5届采矿团竞赛第1名领导人"
      ],
      "research": [
        "高效采矿器"
      ],
      "feedback": [
        "此人为星光圣域模范成员，无任何不良习惯。"
      ]
    },
    {
      "class": "sam",
      "anchor": "pending-stelania-kempter",
      "identity": "",
      "name": "斯德兰妮娅·肯普特",
      "latin": "Stelania Kempter",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "pending-wen-zhilan",
      "identity": "",
      "name": "文芷兰",
      "latin": "Wen Zhilan",
      "gender": "女",
      "birth": "资料待补",
      "race": "资料待补",
      "fleet": "资料待补",
      "residenceLabel": "居住地",
      "residence": "资料待补",
      "roles": [],
      "relatives": [],
      "awards": [],
      "research": [],
      "feedback": []
    },
    {
      "class": "sam",
      "anchor": "10310410122031429",
      "identity": "10310410122031429",
      "name": "尤尔达科·阿斯兰",
      "latin": "Yurdak Aslan",
      "gender": "男",
      "birth": "410/12/20",
      "race": "人类",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟3号 - 艾奥瓦居住区 - 第7居住群 - 第26居住建筑 - 3507",
      "roles": [
        "星光圣域探索协会 会长"
      ],
      "relatives": [],
      "awards": [
        "第8届星光圣域历史比赛第2名"
      ],
      "research": [
        "自动勘探机器人"
      ],
      "feedback": [
        "此人为星光圣域模范成员，无任何不良习惯。"
      ]
    },
    {
      "class": "sfm",
      "anchor": "10403400032074298",
      "identity": "10403400032074298",
      "name": "艾瑞恩·索拉维斯",
      "latin": "Arien Solavis",
      "gender": "男",
      "birth": "430/3/20",
      "race": "人类",
      "fleet": "科研与管理舰队",
      "residenceLabel": "居住地",
      "residence": "科研与管理舰队 - 星辰方舟4号 - 雪原居住区 - 第2居住群 - 第35居住建筑 - 304",
      "roles": [
        "研究员"
      ],
      "relatives": [],
      "awards": [
        "暂无"
      ],
      "research": [
        "人工种族与人类的基因区别"
      ],
      "feedback": [
        "此人为星光圣域模范成员，无任何不良习惯。"
      ]
    },
    {
      "class": "spm",
      "anchor": "暂无",
      "identity": "",
      "name": "凯尔·索伦",
      "latin": "Kyle Soren",
      "gender": "男",
      "birth": "383/3/1",
      "race": "人类",
      "fleet": "科研与管理舰队",
      "residenceLabel": "暂住地",
      "residence": "漆黑守望舰队 - 第VI代科研舰 - 居住区 - 勤务员",
      "roles": [
        "第VI代科研舰“帆”号勤务处 勤务员"
      ],
      "relatives": [],
      "awards": [
        "暂无。"
      ],
      "research": [
        "暂无。"
      ],
      "feedback": [
        "仍在进一步审查中。"
      ]
    }
  ]
};
