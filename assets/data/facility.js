/* =============================================================================
 * 深空设施数据 — 星光圣域
 * -----------------------------------------------------------------------------
 * 深空设施 = 「超级武器」与「巨构」，不设分类层级：左栏名录直接换右栏档案。
 * 名录按归属分组：星光圣域（SSS）固定在最上面，其余按归属缩写首字母排序；
 * 组内顺序 = facilities 的书写顺序。
 *
 * 深空设施大多是多功能的，难以用单一「性质」概括，所以不记录性质字段；
 * 名录用 kind（设施类型 / 级别名）区分。
 *
 * 父子设施：子设施用 parent 指向父设施（如四个分支矩阵挂在 索拉克矩阵 下），
 * 左栏里它们缩进显示在父设施下面，父设施那一行是「文件夹」，点父设施展开、右侧箭头开合。
 * 子设施不再单独出现在归属分组里，分组按父设施的归属算。
 *
 * 加一条设施：往 facilities 里追加一项，id 唯一即可 —— 左栏名录、右栏档案、
 * #锚点跳转都会自动更新；新归属记得在 affiliations 里加缩写。
 *
 * 字段：
 *   id            锚点（#id），只用小写字母 / 数字 / 连字符，发布后别改
 *   parent        父设施 id（可选）：填了就缩进到父设施下面，点父设施时展开；必须指向本文件里已有的条目
 *   name          档案标题（与资料库文件名一致）
 *   kind          设施类型（左栏第一行，例如 自供能深空空间站）
 *   kindEn        类型英文名（左栏第二行，资料库没给就留空）
 *   en            英文名（右栏标题下的英文全名）
 *   abbr          缩写代号（FIPF / SSSMS / SUO …，没有就留空）
 *   affiliation   归属（星光圣域 / 地球联合国 / 汉莎联盟 …）
 *   plan          所属计划（救赎计划 / 通讯计划 …，资料库写了才填）
 *   clearance     授权等级：SXM / SAM / SFM / SPM（与人员档案同一套）；
 *                 「机密」是保护等级（旧说法，正在淘汰），不是授权等级，别写在这里。
 *   foreign       true = 不是星光圣域的巨构（卡片上标「非星光圣域设施」）
 *   damaged       记录损坏 / 截断
 *   damagedNote   损坏说明（写成档案口吻，别写「待补」「暂无」）
 *   intro[]       简介，一段一项
 *   parts         配件：{ unique: [], common: [], note: [] }
 *                 unique / common 为 null = 记录里没有这一节（非星光圣域设施常见）；
 *                 为 [] = 这一节存在但内容损坏，渲染成「数据损坏」
 *                 note[] 是「为什么没有星光圣域配件」这类说明
 *   response[]    应对措施，一段一项
 *   orgs[]        参与组织与势力：{ name, desc[] }
 *
 * affiliations：归属势力 → { abbr }。abbr 用于名录分组标题与排序 ——
 *   星光圣域永远第一，其余按 abbr 首字母排；没有 abbr 的排在带缩写之后，
 *   归属为空的条目归入「数据损坏」组、排最后。
 *
 * 正文是纯文本：不要写资料库的 wiki 链接或资料库路径；复制正文时先把链接展开成显示文本。
 *
 * 缺失数据口径：空字段、截断的段落一律按「数据损坏导致无法访问」处理。
 * 这是站点数据，不是资料库本体；资料库改完后把对应条目同步到这里。
 * ========================================================================== */
window.SSS_FACILITY = {
  "affiliations": {
    "星光圣域": { "abbr": "SSS" },
    "地球联合国": { "abbr": "U.N.E." },
    "汉莎联盟": { "abbr": "HTL" },
    "太空航行管理机构": { "abbr": "" }
  },
  "facilities": [
    {
      "id": "helios",
      "name": "全智能生产设施“赫利俄斯”",
      "kind": "全智能生产设施",
      "kindEn": "Fully Intelligent Production Facility",
      "en": "Fully Intelligent Production Facility \"Helios\"",
      "abbr": "FIPF",
      "affiliation": "星光圣域",
      "plan": "救赎计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "全智能生产设施（Fully Intelligent Production Facility, FIPF）“赫利俄斯”（Helios）是由星光圣域工业与收集舰队和主防御舰队所研发的巨型空间站，能够将一整个行星包围起来，并利用行星上的物质大批量制造“伊利亚特”级智能战列舰和“奥罗拉”级智能战列巡洋舰，直到耗尽该行星的物质为止。此外，FIPF还能以常规引擎于通常宇宙内航行，或是进入次宇宙中躲避危险。"
      ],
      "parts": {
        "unique": [
          {
            "name": "行星分解采集器",
            "en": "Planetary Deconstructor and Harvester",
            "desc": [
              "能够利用功率极高的激光切割行星上的任何物质，将其转化为标准大小的方块，并输送到下一个设施中。根据估算，只需要30个周期便能将维斯佩拉第5行星彻底分解。"
            ]
          },
          {
            "name": "物质重构器",
            "en": "Substances Reconstructer",
            "desc": [
              "负责将被行星分解采集器所收集的物质转化为一种特殊的物质碎星（Broken Stars），且星光圣域目前无法在利用其它设施制造此物质。其由DSRCPSys发现，并将其广泛运用在“伊利亚特”级智能战列舰和“奥罗拉”级智能战列巡洋舰的制造上。"
            ]
          },
          {
            "name": "全智能生产线",
            "en": "Fully Intelligent Prodiction Line",
            "desc": [
              "是由DSRCPSys所自我迭代、设计完成的生产线，能够在碎星供应充足的情况下源源不断地生产“伊利亚特”级智能战列舰和“奥罗拉”级智能战列巡洋舰，并根据实时数据将其派遣到最为合适的位置。虽说如此，星光圣域目前尚未将两者投入实战之中，目前仅作为FIPF的护卫舰队存在。"
            ]
          },
          {
            "name": "行星锚定器",
            "en": "Planet Anchoring Device",
            "desc": [
              "是FIPF最为庞大的配件，其由三个圆环组成，能够将整颗行星包裹其中，并动态调整大小，从而能够便利地完成对行星的分解。同时，其还能维持FIPF在次宇宙内的稳定，收集星能。"
            ]
          },
          {
            "name": "深空资源统筹规划系统",
            "en": "Deep-Space Resource Coordination and Planning System",
            "desc": [
              "可参见《星光圣域非生物智慧体介绍》（DSRCPSys）。"
            ]
          }
        ],
        "common": [
          { "label": "武器系统", "items": ["N/A"] },
          { "label": "防御系统", "items": ["星光圣域能量屏蔽场发生器", "星光圣域自律无人机生产线"] },
          { "label": "移动系统", "items": ["第Ⅴ代星光圣域大型引擎", "第Ⅲ代星光圣域超光速跃迁引擎"] }
        ]
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "occasus",
      "name": "自供能深空空间站“残阳”",
      "kind": "自供能深空空间站",
      "kindEn": "Autonomous Deep-Space Outpost",
      "en": "Autonomous Deep-Space Outpost \"Occasus\"",
      "abbr": "ADSO",
      "affiliation": "星光圣域",
      "plan": "审判计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "自供能深空空间站（Autonomous Deep-Space Outpost, ADSO）“残阳”（Occasus）是由星光圣域工业与收集舰队所研发的巨型空间站，其轴线长970千米，由五个星环与一个中枢构成。借助星光圣域最为先进的技术，残阳号能够在远离主要战场的安全环境中进行超远距离攻击，也能以数万倍光速跳跃至战场第一线，利用其上的战术干扰系统辅助前线作战。"
      ],
      "parts": {
        "unique": [
          {
            "name": "广域星能收集器",
            "en": "Wide-Range Star Energy Collector",
            "desc": [
              "能够收集一整个星系内部的星能，从而为残阳号的各武器设备提供充足的能量，并同时干扰星系内的时空，让残阳号的被侦测范围大大缩小。"
            ]
          },
          {
            "name": "极远距离跳跃设备",
            "en": "Deep-Space Ultralong-Range Jump Device",
            "desc": [
              "能够让残阳号在星能供应充足的情况下通过次宇宙内叠加超光速航行进行极速航行，从而在通常宇宙的一个周期内航行50光年。不过，其在进行极远距离跳跃时需要进行至多3个小时的充能，在此期间ADSO无法进行其它需要高星能的行动。"
            ]
          },
          {
            "name": "战略精准狙击光矛系统",
            "en": "Strategic Precision Lance System",
            "desc": [
              "由主发射器与环绕在其旁的96个小型供能单元共同组成，能够借助次宇宙在通常宇宙1分钟内精准狙击位于通常宇宙25光年内的目标，精度为±5千米。不过，其在狙击前需要进行至多5分钟的充能，在狙击后需要进行至多3分钟的散热，在充能及散热期间ADSO无法进行其它需要高星能的行动。"
            ]
          },
          {
            "name": "战术定向干扰系统",
            "en": "Tactical Directional Jamming System",
            "desc": [
              "由3个干扰器共同组成，能够在通常宇宙中持续定向干扰至远4光年外的敌舰舰队。其需能较少，不需要星能供给，但在不提供额外散热的情况下每次只能至多运作1个周期。"
            ]
          },
          {
            "name": "深空资源统筹规划系统",
            "en": "Deep-Space Resource Coordination and Planning System",
            "desc": [
              "可参见《星光圣域非生物智慧体介绍》（深空资源统筹规划系统）。"
            ]
          }
        ],
        "common": [
          { "label": "武器系统", "items": ["物质分解激光（7）", "近距离防空套组（70）", "无人机组（15000）"] },
          { "label": "防御系统", "items": ["星光圣域能量屏蔽场发生器", "星光圣域自律无人机生产线"] },
          { "label": "移动系统", "items": ["第Ⅴ代星光圣域大型引擎"] }
        ]
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "veritas",
      "name": "通用研究星环“真理”",
      "kind": "通用研究星环",
      "kindEn": "Universal Research Orbital Ring",
      "en": "Universal Research Orbital Ring \"Veritas\"",
      "abbr": "",
      "affiliation": "星光圣域",
      "plan": "解析计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": true,
      "damagedNote": "记录在「加工段」处中断，后续分段无法读取。",
      "intro": [
        "通用研究星环（Universal Research Orbital Ring）“真理”（Veritas）是由星光圣域科研与管理舰队所研发的空间站，目前位于维斯佩拉星系联行星流明的同步轨道，研究该行星的特殊性质，并为维斯佩拉主防御系统提供部分算力支持。",
        "值得一提的是，星光圣域在目前已经建造了复数个通用研究星环，并计划在更多行星轨道上建造。“真理”号是模板星环，根据不同的行星环境，其他通用研究星环的配件将会有所变更。"
      ],
      "parts": {
        "unique": [
          {
            "name": "主体星环设施",
            "en": "Main Orbital Ring Facilitiy",
            "desc": [
              "是通用研究星环的主体，能够在99%行星的同步轨道上进行固定，并为其他的分段提供安装节点。",
              "由于行星的直径不同，各星环的主体星环设施尺寸也不相同，其上所能拥有的安装节点数量也有所不同。“真理”号是模板星环，其上安装了所有通用性较强的配件，作为其他星环的安装模板。"
            ]
          },
          {
            "name": "分段",
            "en": "",
            "desc": [
              "是一个统称，依照用途分为不同的具体段。详情见下方。"
            ],
            "children": [
              {
                "name": "管理段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环的核心，负责管理该星环所有分段，并能够储存部分数据。",
                  "管理段一旦损坏，整个星环就会进入橙色警报，所有的分段都会停止运行。"
                ]
              },
              {
                "name": "解析段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环最为重要的分段之一，能够分析行星的异常情况，并为其他分段提供算力支持。",
                  "一般来说，所有星环都需要安装解析段。"
                ]
              },
              {
                "name": "扫描段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环用于对行星资源进行扫描的分段，只要是星光圣域需要的资源，都能够通过扫描进行锁定。",
                  "视行星体积，完成整颗行星的扫描需要10个周期到360个周期。"
                ]
              },
              {
                "name": "防御段",
                "meta": "占用安装节点数：2",
                "desc": [
                  "是通用研究星环用于防范外界攻击的分段，无论是从行星表面（星环内侧）还是深空（星环外侧）都的攻击，都在防御段的防御范围之内。",
                  "如果有需要的话，可以安装复数的防御段进行防御。在这种情况下，通常会将该星环作为星光圣域防御线的一部分。"
                ]
              },
              {
                "name": "居住段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环为研究员提供居住环境的分段，能够容纳上千人，并为他们提供所有必备的生活设施。",
                  "如果没有长期居住或大量居住情况的话，管理段能够满足50人的需求。"
                ]
              },
              {
                "name": "采集段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环用于采集该行星资源的分段，能够控制采矿无人机进行采集，也能够部署机器人进行生物质收集。"
                ]
              },
              {
                "name": "加工段",
                "meta": "占用安装节点数：1",
                "desc": [
                  "是通用研究星环用于加工并生产产品的分段，"
                ]
              }
            ]
          }
        ],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "eternity",
      "name": "星光圣域主服务器第III代“永恒”",
      "kind": "星光圣域主服务器",
      "kindEn": "Starlight Sacred Sanctuary Main Server",
      "en": "Starlight Sacred Sanctuary Main Server Gen III \"Eternity\"",
      "abbr": "SSSMS",
      "affiliation": "星光圣域",
      "plan": "",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "星光圣域主服务器（Starlight Sacred Sanctuary Main Server，SSSMS）第III代“永恒”（Eternity）是星光圣域第3代主服务器，能够支持星光圣域95%以上的运算服务。目前“永恒”号位于次宇宙之中，与STRF Eternal Light一起构成了星光圣域的数据处理与计算核心。",
        "“永恒”取代了第II代“奇迹”（Miracle）与第I代“水晶”（Crystal），成为目前星光圣域最主要的主服务器。"
      ],
      "parts": {
        "unique": [
          {
            "name": "极高速计算中心",
            "en": "Extremely High-speed Computing Center",
            "desc": [
              "是大型服务器的核心，能够以难以想象的运算速度进行计算，从而使其能够处理星光圣域乃至全宇宙的所有数据流，并提取其中的关键信息。"
            ]
          },
          {
            "name": "次宇宙局部稳定器",
            "en": "Subuniverse Partial Stabilizer",
            "desc": [
              "是SSSMS能够在次宇宙中进行运算的重要部分，其能够利用次宇宙内的星能进行对次宇宙的稳定，从而保证极高速计算中心的运算能够正常运行。"
            ]
          },
          {
            "name": "次宇宙数据传输设备",
            "en": "Subuniverse Data Transfer Module",
            "desc": [
              "是SSSMS与STRF进行联系的重要设备。尽管次宇宙中有强烈的干扰，但星光圣域高级加密链路仍能够保证数据的安全传输。"
            ],
            "children": [
              {
                "name": "数据统筹规划系统",
                "en": "Data Coodination and Planning System",
                "desc": [
                  "可参见《星光圣域非生物智慧体介绍》（DCPSys）。"
                ]
              },
              {
                "name": "深空资源统筹规划系统",
                "en": "Deep-Space Resource Coordination and Planning System",
                "desc": [
                  "可参见《星光圣域非生物智慧体介绍》（DSRCPSys）。"
                ]
              }
            ]
          }
        ],
        "common": [
          { "label": "武器系统", "items": ["N/A"] },
          { "label": "防御系统", "items": ["N/A"] },
          { "label": "移动系统", "items": ["N/A"] },
          { "label": "数据系统", "items": ["大型储存单元（20）"] }
        ]
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "eternallight",
      "name": "次宇宙传输与记录设施“永恒之光”",
      "kind": "次宇宙传输与记录设施",
      "kindEn": "Subuniverse Transmission and Recording Facility",
      "en": "Subuniverse Transmission and Recording Facility \"Eternal Light\"",
      "abbr": "STRF",
      "affiliation": "星光圣域",
      "plan": "黑洞计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "次宇宙传输与记录设施（Subuniverse Transmission and Recording Facility，STRF）“永恒之光”（Eternal Light）是由星光圣域科研与管理舰队所研发的巨型空间站，主要由七个大型服务器与三个大型次宇宙特化储存单元构成，能够储存目前星光圣域的所有数据。同时，永恒之光号支持热更新其储存单元，从而让其实际储存数据能力能够一直增长。"
      ],
      "parts": {
        "unique": [
          {
            "name": "极高速计算中心",
            "en": "Extremely High-speed Computing Center",
            "desc": [
              "是大型服务器的核心，能够以难以想象的运算速度进行计算，从而使其能够处理星光圣域乃至全宇宙的所有数据流，并提取其中的关键信息。"
            ]
          },
          {
            "name": "次宇宙局部稳定器",
            "en": "Subuniverse Partial Stabilizer",
            "desc": [
              "位于STRF的中心，能够利用次宇宙中的星能稳定一部分的次宇宙，从而让极高速计算中心能够进行正确的计算。同时，其还能阻止次宇宙中的异常靠近STRF，让STRF不需要进行防御，从而让尽可能多的能量集中于数据计算中。"
            ]
          },
          {
            "name": "通常宇宙 - 次宇宙数据传输设备",
            "en": "Prime-Subuniverse Data Transfer Module",
            "desc": [
              "是STRF与星光圣域进行联系的主要设备，其能够借助星光圣域高级加密链路将数据安全地在通常宇宙与次宇宙之间进行传输，同时能够将误码率降低至0，从而极大地减少数据传输的成本。"
            ]
          },
          {
            "name": "数据统筹规划系统",
            "en": "Data Coodination and Planning System",
            "desc": [
              "可参见《星光圣域非生物智慧体介绍》（DCPSys）。"
            ]
          },
          {
            "name": "深空资源统筹规划系统",
            "en": "Deep-Space Resource Coordination and Planning System",
            "desc": [
              "可参见《星光圣域非生物智慧体介绍》（DSRCPSys）。"
            ]
          }
        ],
        "common": [
          { "label": "武器系统", "items": ["N/A"] },
          { "label": "防御系统", "items": ["N/A"] },
          { "label": "移动系统", "items": ["N/A"] },
          { "label": "数据系统", "items": ["大型储存单元（30）"] }
        ]
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "allseeingeye",
      "name": "自供能极长距离观测站“全视之眼”",
      "kind": "自供能极长距离观测站",
      "kindEn": "Autonomous Extremely-Long Range Observatory",
      "en": "Autonomous Extremely-Long Range Observatory \"All-Seeing Eye\"",
      "abbr": "AELRO",
      "affiliation": "星光圣域",
      "plan": "真理计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "自供能极长距离观测站（Autonomous Extremely-Long Range Observatory，AELRO）“全视之眼”（All-Seeing Eye）是由星光圣域科研与管理舰队所研发的巨型空间站，位于维斯佩拉星系γ星的恒星轨道，能够借助星能进行对数十乃至数百光年外的目标进行精确侦测。"
      ],
      "parts": {
        "unique": [
          {
            "name": "极高精度星能波动监测器",
            "en": "Ultra-Precise Star Energy Fluctuation Monitor",
            "desc": [
              "是星光圣域对极远距离侦测的一个实验型装置。尽管星能在宇宙中处处相等，但在进行星能转换时，还是会在极短时间内产生极其微小的波动。目前，全人类只有星光圣域的极高精度星能波动监测器能够跨越数百光年监测波动。而且，监测瞬间同步，能够超越光速的限制。但需要注意的是，其他势力对星能的利用程度极低，此装置往往无法观测到非星光圣域舰队。"
            ]
          },
          {
            "name": "极高精度光学观测器",
            "en": "Untra-Precise Optical Observer",
            "desc": [
              "是星光圣域对极远距离侦测的一个装置。尽管其受到光速的严重限制，且无法侦测到超光速物体，但在对深空的观测方面发挥着重大的作用。同时，部分亚光速舰船也能够被其侦测到，作为一道可有可无的保险。"
            ]
          },
          {
            "name": "极高精度空间波动监测器",
            "en": "Untra-Precise Space Fluctuation Monitor",
            "desc": [
              "是星光圣域对极远距离进行侦测的一个装置。空间波动能够以数百倍光速传播，对于目前的人类来说，这是暂时难以逾越的速度极限。在星光圣域的预估之中，在未来的三十年内，人类在通常宇宙内的产光速航行都无法达到百倍光速。"
            ]
          },
          {
            "name": "高精度次宇宙光学观测器",
            "en": "High-Precise Subuniverse",
            "desc": [
              "是星光圣域用于防卫可能存在于次宇宙中的异常所特别设计的装置。除了常规的天文观测外，还能以极高速率进行环视，从而保证所有异常在进入远距离警戒范围后发出警告。"
            ]
          }
        ],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "hoshinofune",
      "name": "标准宇宙空间观测站“星之舟”",
      "kind": "标准宇宙空间观测站",
      "kindEn": "Standard Universe Observatory",
      "en": "Standard Universe Observatory \"Hoshi No Fune\"",
      "abbr": "SUO",
      "affiliation": "星光圣域",
      "plan": "",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "标准宇宙空间观测站（Standard Universe Observatory，SUO）“星之舟”（Hoshi No Fune，Star Boat）是由星光圣域科研与管理舰队所研发的巨型空间站，其唯一目的为观测寂静领域外部的宇宙空间。",
        "尽管我们没有办法到达寂静领域外部，导致无法对观测到的结果进行验证，但借助多年来的历史观测数据，我们可以得到相对准确的结果，只要寂静领域之外的宇宙法则与我们所在的宇宙相同。"
      ],
      "parts": {
        "unique": [],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "startrails",
      "name": "次宇宙导航信标“星轨”",
      "kind": "次宇宙导航信标",
      "kindEn": "Subuniverse Navigation Beacon",
      "en": "Subuniverse Navigation Beacon \"Startrails\"",
      "abbr": "",
      "affiliation": "星光圣域",
      "plan": "",
      "clearance": "SAM",
      "foreign": false,
      "damaged": true,
      "damagedNote": "记录在「独特配件」处中断，配件信息无法读取。",
      "intro": [
        "次宇宙导航信标（Subuniverse Navigation Beacon）“星轨”（Startrails）是由星光圣域科研与管理舰队所研发的巨型空间站，其是星光圣域对次宇宙研究的结果之一，让星光圣域所有舰船在进行次宇宙超光速航行和超光速跃迁时得到辅助，从而极大程度地提高次宇宙超光速航行的安全性。",
        "尽管星光圣域仍未完全查明次宇宙的本质，但星光圣域已经能够在很大程度上利用次宇宙的性质进行航行。"
      ],
      "parts": {
        "unique": [],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "hourglass",
      "name": "通用时间校准设施“沙漏”",
      "kind": "通用时间校准设施",
      "kindEn": "Universal Time Calibration Facility",
      "en": "Universal Time Calibration Facility \"Hourglass\"",
      "abbr": "UTCF",
      "affiliation": "星光圣域",
      "plan": "蜂鸣器计划",
      "clearance": "SAM",
      "foreign": false,
      "damaged": true,
      "damagedNote": "记录在「脉冲星干涉器」处中断，配件信息无法读取。",
      "intro": [
        "通用时间校准设施（Universal Time Calibration Facility，UTCF）“沙漏”（Hourglass）是由星光圣域科研与管理舰队所研发的巨型空间站，其通过复数方法对时间进行极为精确的确定，从而保证星光圣域所有极高精度设备能够正常进行进行计时作业。"
      ],
      "parts": {
        "unique": [
          {
            "name": "脉冲星干涉器",
            "en": "",
            "desc": []
          }
        ],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "navpoint",
      "name": "导航点",
      "kind": "导航点",
      "kindEn": "",
      "en": "",
      "abbr": "",
      "affiliation": "星光圣域",
      "plan": "",
      "clearance": "",
      "foreign": false,
      "damaged": true,
      "damagedNote": "记录在传输中断，正文无法读取。",
      "intro": [
        "导航点是星光圣域将标准灯塔……"
      ],
      "parts": {
        "unique": [],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "sls",
      "name": "标准灯塔系统",
      "kind": "标准灯塔系统",
      "kindEn": "Standard Lighthouse System",
      "en": "Standard Lighthouse System",
      "abbr": "SLS",
      "affiliation": "太空航行管理机构",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "标准灯塔系统（Standard Lighthouse System，SLS）是由太空航行管理机构所主导的公益性建设，通过构建数个标准灯塔设施，为所有舰船提供精确到星系的定位服务。",
        "在通过成员集体投票后，星光圣域加入了SLS的建设，成为了第7个参与到SLS建设之中的势力。"
      ],
      "parts": {
        "unique": null,
        "common": null,
        "note": [
          "由于标准灯塔系统的设计由非星光圣域官方计划负责，故没有星光圣域的独特配件。",
          "由于标准灯塔系统不是星光圣域的巨构，故其上没有星光圣域的通用配件。"
        ]
      },
      "response": [],
      "orgs": [
        {
          "name": "太空航行管理机构",
          "desc": [
            "太空航行管理机构是标准灯塔系统的主要组织成员，其主要负责统筹所有标准灯塔的建设。",
            "太空航行管理机构原本是地球联合国在探索时期用于管理各探索舰队的机构，随着第一次远距离探索的结束，太空航行管理机构也逐渐被废弃，直到黄金时期的到来，太空航行管理机构才成为管理全宇宙航行的公共机构。"
          ]
        },
        {
          "name": "樱花集团",
          "desc": [
            "樱花集团是受到汉莎联盟影响深远的一个企业，是汉莎联盟第一批“加盟企业”之一，其负责在各边境星域中进行SLS的推广。",
            "尽管樱花集团的主要业务是食品，但其在探索方面仍有一定的话语权。"
          ]
        },
        {
          "name": "地球联合国",
          "desc": [
            "地球联合国是标准灯塔系统的主要成员，其主要负责为标准灯塔系统在地球联合国星域及边境星域的建设提供支持。",
            "作为太空航行管理机构的管理方，地球联合国认为其需要为全人类的宇宙航行提供标准指导方案。",
            "注：无论在任何时间和地点，都请遵循星光圣域的航行指南。"
          ]
        },
        {
          "name": "星光圣域",
          "desc": [
            "星光圣域是标准灯塔系统的主要成员，其主要负责为标准灯塔系统的建设提供技术支持与部分位于星光圣域星域内的标准灯塔设计。",
            "星光圣域并无对SLS的需求，但出于为星光圣域预备成员和星光圣域正式成员提供低成本研究项目的需要，星光圣域承担了技术支持的任务。尽管如此，对SLS的建设仍需符合星光圣域验证规范。"
          ]
        }
      ]
    },
    {
      "id": "lighthouse",
      "parent": "sls",
      "name": "标准灯塔",
      "kind": "标准灯塔",
      "kindEn": "Standard Lighthouse",
      "en": "Standard Lighthouse",
      "abbr": "Std.Lh",
      "affiliation": "太空航行管理机构",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": true,
      "damagedNote": "记录在「部署在边境星域的」处中断，后续内容无法读取。",
      "intro": [
        "标准灯塔（Standard Lighthouse，Std.Lh）是标准灯塔系统的重要组成部分之一，用于为舰船提供定位服务。",
        "标准灯塔类似于脉冲星，会定期向宇宙空间发出特定频率的脉冲。所有标准灯塔的位置和频率都是确定而唯一的，只要通过简单的三角定位，就能让舰船知道自己的位置。",
        "Std.Lh所发出的频率不可避免地会对观测仪器造成干扰，这一点可以通过部署在边境星域的……"
      ],
      "parts": null,
      "response": [],
      "orgs": []
    },
    {
      "id": "p304",
      "parent": "sls",
      "name": "标准灯塔系统节点“P-304”",
      "kind": "标准灯塔系统节点",
      "kindEn": "SLS Node",
      "en": "SLS Node \"P-304\"",
      "abbr": "",
      "affiliation": "星光圣域",
      "plan": "",
      "clearance": "SAM",
      "foreign": false,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "标准灯塔系统（Standard Lighthouse System，SLS）是由太空航行管理机构所主导的公益性建设。",
        "标准灯塔系统节点（SLS Node）则是利用深空中的脉冲星作为节点，为SLS提供定位，其中星光圣域境内的P-304脉冲星承担了一个节点，并负责了该节点的设计与建造。"
      ],
      "parts": {
        "unique": [
          {
            "name": "标准灯塔系统接口",
            "en": "",
            "desc": [],
            "children": [
              {
                "name": "标准灯塔系统-星图系统编程接口",
                "en": "SLS-StarmapOS Programming Interface",
                "desc": [
                  "是星光圣域为连接星图系统与标准灯塔系统所特别设计的接口，旨在将星图系统与标准灯塔系统进行连接，降低两者通信之间的信息损耗，并提高数据交换效率。"
                ]
              },
              {
                "name": "标准灯塔系统-索拉克矩阵编程接口",
                "en": "SLS-Solak Matrix Programming Interface",
                "desc": [
                  "是星光圣域为连接索拉克矩阵与标准灯塔系统所特别设计的接口，旨在将索拉克矩阵与标准灯塔系统进行连接，降低两者通信之间的信息损耗，并提高数据交换效率。"
                ]
              }
            ]
          }
        ],
        "common": []
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "solak",
      "name": "索拉克矩阵",
      "kind": "索拉克矩阵",
      "kindEn": "Solak Matrix",
      "en": "Solak Matrix",
      "abbr": "",
      "affiliation": "地球联合国",
      "plan": "通讯计划",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "索拉克矩阵（Solak Matrix）是由地球联合国主导的一项公益性质的建设，其位于索拉克星系的恒星轨道上，由星际防御联盟协助进行维护。",
        "索拉克矩阵的建造目的是将整个宇宙联系起来，其运作方式为集中所有索拉克分支矩阵的数据，在索拉克矩阵进行交换，随后分发出去。只是，由于其所需运算量巨大、能源消耗难以计数，故需要建造如此巨大的数据交中心。"
      ],
      "parts": {
        "unique": [
          {
            "name": "索拉克矩阵数据交换器",
            "en": "Solak Matrix Data Transmitter",
            "desc": [
              "能够将来自不同分支矩阵的数据汇总，并再分发至相应的分支矩阵。由于数据量庞大和冗余需要，索拉克矩阵数据交换器实际上有三个，三者交替运行。"
            ]
          },
          {
            "name": "通常宇宙数据传输设备",
            "en": "Primeuniverse Data Transfer Module",
            "desc": [
              "负责在分支矩阵与主矩阵之间传递数据。借助星光圣域高级加密链路，能够在保持数据不被窃取的同时实现超光速传输。"
            ]
          }
        ],
        "common": null,
        "note": [
          "由于索拉克矩阵不是星光圣域的巨构，故其上没有星光圣域的通用配件。"
        ]
      },
      "response": [],
      "orgs": [
        {
          "name": "地球联合国",
          "desc": [
            "地球联合国是索拉克矩阵建造的主要成员，其主要负责硬件建设。",
            "作为方案提出方，地球联合国主动承接了硬件建造的任务。索拉克矩阵的建筑框架及日常设施等均由地球联合国建造，同时其还建造了部分自动防御设施，以防万一。"
          ]
        },
        {
          "name": "汉莎联盟",
          "desc": [
            "汉莎联盟是索拉克矩阵建造的主要成员，其主要负责宣传及后续维护。",
            "汉莎联盟掌握着全宇宙的商路，并认为索拉克矩阵能够为其商业提供充足的价值，故汉莎联盟利用其影响力在全宇宙推行索拉克矩阵，并主动为边境星域建造了多个索拉克分支矩阵。"
          ]
        },
        {
          "name": "星际防御联盟",
          "desc": [
            "星际防御联盟是索拉克矩阵建造的成员，其主要负责后续防御。",
            "星际防御联盟作为中立势力，自然而然地承担起了保护此巨构不受外界干扰的任务。"
          ]
        },
        {
          "name": "星光圣域",
          "desc": [
            "星光圣域是索拉克矩阵建造的主要成员，其主要负责软件研发。",
            "参见“通讯计划”详情。"
          ]
        }
      ]
    },
    {
      "id": "solak-astra",
      "parent": "solak",
      "name": "索拉克分支矩阵“阿斯特拉利斯”",
      "kind": "索拉克分支矩阵",
      "kindEn": "Solak Branch Matrix",
      "en": "Solak Branch Matrix",
      "abbr": "",
      "affiliation": "星光圣域",
      "plan": "通讯计划",
      "clearance": "SAM",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "索拉克矩阵（Solak Matrix）是由地球联合国主导的一项公益性质的建设，其位于索拉克星系的恒星轨道上，由星际防御联盟协助进行维护。",
        "索拉克分支矩阵（Solak Branch Matrix）则由各需要接入索拉克矩阵的势力自行建造，星光圣域境内的索拉克分支矩阵位于阿斯特拉利斯星系的恒星轨道上，名称为索拉克分支矩阵“阿斯特拉利斯”号。其同时也是最大的分支矩阵，能够覆盖星光圣域全境及附近的边境星域。"
      ],
      "parts": {
        "unique": [
          {
            "name": "索拉克矩阵传输协议匹配器",
            "en": "Solak Matrix Transmission Protocol Matcher",
            "desc": [
              "负责大规模编码与解析索拉克传输协议，从而保持数据传输的速率能够维持稳定。同时，统一编码还能够降低终端设备的负载。"
            ]
          },
          {
            "name": "通常宇宙数据传输设备",
            "en": "Primeuniverse Data Transfer Module",
            "desc": [
              "负责在分支矩阵与主矩阵之间传递数据。借助星光圣域高级加密链路，能够在保持数据不被窃取的同时实现超光速传输。"
            ]
          },
          {
            "name": "高速计算中心",
            "en": "High-speed Computing Center",
            "desc": [
              "是索拉克分支矩阵的核心，负责压缩与解压星光圣域与索拉克分支矩阵之间的数据流。即使抛开算法不谈，高速计算中心仍是人类在通常宇宙中算力最为庞大的设施之一。"
            ]
          },
          {
            "name": "星光圣域权限锚定装置",
            "en": "Starlight Sacred Sanctuary Authorization Anchor Module",
            "note": "这不是索拉克分支矩阵的原生装置",
            "desc": [
              "是由地球联合国所授权并提供的权限锚定装置，用于防止星光圣域对索拉克矩阵的管理权限遭到窃取。",
              "事实上，星光圣域并不需要此类装置。但依照计算，此装置对索拉克分支矩阵的影响小于1‰，故星光圣域并未拒绝安装。"
            ]
          }
        ],
        "common": [
          { "label": "武器系统", "items": ["N/A"] },
          { "label": "防御系统", "items": ["N/A"] },
          { "label": "移动系统", "items": ["N/A"] },
          { "label": "数据系统", "items": ["大型储存单元（7）"] },
          {
            "label": "通信系统",
            "items": [
              "星光圣域高级加密链路 - 发射端",
              "星光圣域高级加密链路 - 接收端",
              "地球联合国通信协议 - 接收端",
              "汉莎联盟通用传输协议 - 接收端"
            ]
          }
        ]
      },
      "response": [],
      "orgs": []
    },
    {
      "id": "solak-fisha",
      "parent": "solak",
      "name": "索拉克分支矩阵“费沙”",
      "kind": "索拉克分支矩阵",
      "kindEn": "Solak Branch Matrix",
      "en": "Solak Branch Matrix",
      "abbr": "",
      "affiliation": "汉莎联盟",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "索拉克矩阵（Solak Matrix）是由地球联合国主导的一项公益性质的建设，其位于索拉克星系的恒星轨道上，由星际防御联盟协助进行维护。",
        "索拉克分支矩阵（Solak Branch Matrix）则由各需要接入索拉克矩阵的势力自行建造，汉莎联盟的索拉克分支矩阵位于费沙星系的第二与第三行星轨道之间，名称为“费沙”通信矩阵。其是数据流最大的分支矩阵，80%的经济活动均需要经过该分支矩阵。"
      ],
      "parts": null,
      "response": [
        "此设施通过了星光圣域的无威胁研究认证，无需进行额外处理。",
        "注：星光圣域的通信链路是已经经过加密的，不需要再进行额外加密。"
      ],
      "orgs": []
    },
    {
      "id": "solak-nanmen",
      "parent": "solak",
      "name": "索拉克分支矩阵“南门二”",
      "kind": "索拉克分支矩阵",
      "kindEn": "Solak Branch Matrix",
      "en": "Solak Branch Matrix",
      "abbr": "",
      "affiliation": "地球联合国",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "索拉克矩阵（Solak Matrix）是由地球联合国主导的一项公益性质的建设，其位于索拉克星系的恒星轨道上，由星际防御联盟协助进行维护。",
        "索拉克分支矩阵（Solak Branch Matrix）则由各需要接入索拉克矩阵的势力自行建造，地球联合国的索拉克分支矩阵位于南门二星系的第二与第三行星轨道之间，名称为“地球联合国通信副中枢”。其与地球联合国的“信鸽”通信阵列共同承担着地球联合国及大部分组织的跨星系通信任务。"
      ],
      "parts": null,
      "response": [
        "此设施通过了星光圣域的无威胁研究认证，无需进行额外处理。",
        "注：星光圣域的通信链路是已经经过加密的，不需要再进行额外加密。"
      ],
      "orgs": []
    },
    {
      "id": "solak-sacred",
      "parent": "solak",
      "name": "索拉克分支矩阵“神圣之地”",
      "kind": "索拉克分支矩阵",
      "kindEn": "Solak Branch Matrix",
      "en": "Solak Branch Matrix",
      "abbr": "",
      "affiliation": "阿尔赫尼托追随者教团",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": true,
      "damagedNote": "记录在「自行建造」处中断，归属与位置无法确认。",
      "intro": [
        "索拉克矩阵（Solak Matrix）是由地球联合国主导的一项公益性质的建设，其位于索拉克星系的恒星轨道上，由星际防御联盟协助进行维护。",
        "索拉克分支矩阵（Solak Branch Matrix）则由各需要接入索拉克矩阵的势力自行建造，……"
      ],
      "parts": null,
      "response": [],
      "orgs": []
    },
    {
      "id": "andromeda",
      "name": "“仙女座”级超重型炮击阵列",
      "kind": "“仙女座”级超重型炮击阵列",
      "kindEn": "Andromeda-class Super Heavy Artillery Array",
      "en": "Andromeda-class Super Heavy Artillery Array",
      "abbr": "",
      "affiliation": "地球联合国",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "“仙女座”级超重型炮击阵列（Andromeda-class Super Heavy Artillery Array）是由地球联合国所建造的攻击巨构，是在“英仙座”级重型炮击阵列的基础上更新而来。",
        "在吸收了许多的新设施设计经验之后，“仙女座”级超重型炮击阵列相较于前代有着相当大程度的升级，已经成为了人类的强力武器之一。"
      ],
      "parts": null,
      "response": [
        "维斯佩拉主防御系统能够保证其无法对维斯佩拉星域内的舰船进行攻击，对于在维斯佩拉主防御系统之外的舰船，推荐在侦测到攻击信号后进行机动，并向着上或下方向移动。",
        "我们没有有关数据，无法进行准确推测，只能进行推测。",
        "预计星光圣域的护盾系统能够抵挡部分攻击，尽量避免在其射程内交战。"
      ],
      "orgs": []
    },
    {
      "id": "perseus",
      "name": "“英仙座”级重型炮击阵列",
      "kind": "“英仙座”级重型炮击阵列",
      "kindEn": "Perseus-class Heavy Artillery Array",
      "en": "Perseus-class Heavy Artillery Array",
      "abbr": "",
      "affiliation": "地球联合国",
      "plan": "",
      "clearance": "",
      "foreign": true,
      "damaged": false,
      "damagedNote": "",
      "intro": [
        "“英仙座”级重型炮击阵列（Perseus-class Heavy Artillery Array）是由地球联合国所建造的攻击巨构，也是人类历史上第一个攻击性巨构。",
        "尽管历史悠久，其上的部分系统也已经过时，但其仍能正常运作，加上地球联合国对其进行的维护，让“英仙座”级重型炮击阵列即使在现在也能够发挥重要的价值。",
        "需要注意的是，地球联合国在其星域内有有复数个“英仙座”级重型炮击阵列。尽管地球联合国官方宣布其不会建造新的“英仙座”级重型炮击阵列，但目前“英仙座”级重型炮击阵列的位置与数量均属于保密范畴。"
      ],
      "parts": null,
      "response": [
        "维斯佩拉主防御系统能够保证其无法对维斯佩拉星域内的舰船进行攻击，对于在维斯佩拉主防御系统之外的舰船，推荐在侦测到攻击信号后进行机动，并向着上或下方向移动。",
        "星光圣域的护盾系统在理论上能够抵挡攻击，但尚未验证。"
      ],
      "orgs": []
    }
  ]
};
