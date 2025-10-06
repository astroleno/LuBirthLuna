import { LocationData, LocationTree, SearchIndex } from './types';
import { provinces, cityToProvinceMap, getProvinceName, getCitiesByProvince } from './administrativeData';

// 拼音转换工具
const pinyinMap: { [key: string]: string } = {
  '北京': 'beijing',
  '上海': 'shanghai',
  '天津': 'tianjin',
  '重庆': 'chongqing',
  '广东': 'guangdong',
  '江苏': 'jiangsu',
  '浙江': 'zhejiang',
  '山东': 'shandong',
  '河南': 'henan',
  '四川': 'sichuan',
  '湖北': 'hubei',
  '湖南': 'hunan',
  '河北': 'hebei',
  '福建': 'fujian',
  '安徽': 'anhui',
  '江西': 'jiangxi',
  '辽宁': 'liaoning',
  '黑龙江': 'heilongjiang',
  '吉林': 'jilin',
  '山西': 'shanxi',
  '陕西': 'shaanxi',
  '甘肃': 'gansu',
  '青海': 'qinghai',
  '新疆': 'xinjiang',
  '西藏': 'xizang',
  '宁夏': 'ningxia',
  '内蒙古': 'neimenggu',
  '广西': 'guangxi',
  '云南': 'yunnan',
  '贵州': 'guizhou',
  '海南': 'hainan',
  '香港': 'xianggang',
  '澳门': 'aomen',
  '台湾': 'taiwan'
};

// 简单的中文转拼音（主要针对省级行政区）
function toPinyin(text: string): string {
  return pinyinMap[text] || text.toLowerCase();
}

// 解析CSV数据
export function parseCSVData(csvText: string): LocationData[] {
  const lines = csvText.trim().split('\n');
  const data: LocationData[] = [];
  
  // 跳过标题行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [city, district, lon, lat] = line.split(',');
    
    // 使用映射获取正确的省份
    const province = getProvinceName(city);
    
    if (!province) {
      console.warn(`无法找到城市 ${city} 对应的省份`);
      continue;
    }
    
    data.push({
      province,
      city,
      district,
      lon: parseFloat(lon),
      lat: parseFloat(lat)
    });
  }
  
  return data;
}

// 构建正确的树形结构（基于中国行政层级）
export function buildLocationTree(data: LocationData[]): LocationTree {
  const tree: LocationTree = { provinces: {} };
  
  // 首先添加所有省份
  provinces.forEach(province => {
    tree.provinces[province.name] = {
      name: province.name,
      cities: {}
    };
  });
  
  // 然后添加城市和区县数据
  data.forEach(item => {
    const { province, city, district, lon, lat } = item;
    
    // 确保省份存在
    if (!tree.provinces[province]) {
      tree.provinces[province] = {
        name: province,
        cities: {}
      };
    }
    
    // 确保城市存在
    if (!tree.provinces[province].cities[city]) {
      tree.provinces[province].cities[city] = {
        name: city,
        districts: {}
      };
    }
    
    // 添加区县
    tree.provinces[province].cities[city].districts[district] = {
      name: district,
      lon,
      lat
    };
  });
  
  return tree;
}

// 构建搜索索引
export function buildSearchIndex(data: LocationData[]): SearchIndex {
  const index: SearchIndex = {};
  
  data.forEach(item => {
    const { province, city, district } = item;
    
    // 全名搜索
    const fullName = `${province}${city}${district}`;
    const cityDistrict = `${city}${district}`;
    
    // 添加到索引
    [fullName, cityDistrict, province, city, district].forEach(key => {
      if (!index[key]) {
        index[key] = [];
      }
      index[key].push(item);
    });
    
    // 拼音搜索
    const pinyinKey = toPinyin(fullName);
    if (!index[pinyinKey]) {
      index[pinyinKey] = [];
    }
    index[pinyinKey].push(item);
  });
  
  return index;
}

// 搜索功能
export function searchLocations(query: string, searchIndex: SearchIndex): LocationData[] {
  if (!query.trim()) return [];
  
  const results: LocationData[] = [];
  const seen = new Set<string>();
  
  // 精确匹配
  if (searchIndex[query]) {
    searchIndex[query].forEach(item => {
      const key = `${item.province}-${item.city}-${item.district}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    });
  }
  
  // 模糊匹配
  Object.keys(searchIndex).forEach(key => {
    if (key.includes(query) && !seen.has(key)) {
      searchIndex[key].forEach(item => {
        const itemKey = `${item.province}-${item.city}-${item.district}`;
        if (!seen.has(itemKey)) {
          seen.add(itemKey);
          results.push(item);
        }
      });
    }
  });
  
  // 按相关性排序（精确匹配优先）
  return results.sort((a, b) => {
    const aExact = a.province === query || a.city === query || a.district === query;
    const bExact = b.province === query || b.city === query || b.district === query;
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    return 0;
  }).slice(0, 20); // 限制结果数量
}

// 获取省份列表
export function getProvinces(tree: LocationTree): string[] {
  return Object.keys(tree.provinces).sort();
}

// 获取城市列表
export function getCities(tree: LocationTree, province: string): string[] {
  if (!tree.provinces[province]) return [];
  return Object.keys(tree.provinces[province].cities).sort();
}

// 获取省份下的所有城市（基于行政数据）
export function getCitiesByProvinceName(province: string): string[] {
  return getCitiesByProvince(province);
}

// 获取区县列表
export function getDistricts(tree: LocationTree, province: string, city: string): string[] {
  if (!tree.provinces[province] || !tree.provinces[province].cities[city]) return [];
  return Object.keys(tree.provinces[province].cities[city].districts).sort();
}

// 获取位置坐标
export function getLocationCoords(tree: LocationTree, province: string, city: string, district: string): { lon: number; lat: number } | null {
  if (!tree.provinces[province] || !tree.provinces[province].cities[city]) return null;
  
  const districtData = tree.provinces[province].cities[city].districts[district];
  if (!districtData) return null;
  
  return { lon: districtData.lon, lat: districtData.lat };
}