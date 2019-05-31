/*
 * @Date: 2019-05-11 15:02:18
 * @Last Modified time: 2019-05-11 15:02:18
 * @Desc: mixins
 */

import { setLocalStorage } from '../lib/util';

module.exports = {
  methods: {
    exportPosition: function() {
      var pos = this.$prompt('请输入标签', '缓存位置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValidator: value => {
          if (value.length == 0) return '请输入标签';
          return true;
        }
      }).then(({ value }) => {
        this.$message({
          type: 'success',
          message: '你的邮箱是: ' + value
        });
      });
    },
    importPosition: function() {},
    out_of_china: function(lng, lat) {
      return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
    },

    transformlat: function(lng, lat) {
      //定义一些常量
        var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
        var PI = 3.1415926535897932384626;
        var a = 6378245.0;
        var ee = 0.00669342162296594323;
        var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
        return ret
    },

    transformlng: function(lng, lat) {
      //定义一些常量
        var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
        var PI = 3.1415926535897932384626;
        var a = 6378245.0;
        var ee = 0.00669342162296594323;
        var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
        return ret
    },

    gcj02towgs84: function(lng, lat) {
        //定义一些常量
        var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
        var PI = 3.1415926535897932384626;
        var a = 6378245.0;
        var ee = 0.00669342162296594323;
        if (this.out_of_china(lng, lat)) {
            return [lng, lat]
        } else {
            var dlat = this.transformlat(lng - 105.0, lat - 35.0);
            var dlng = this.transformlng(lng - 105.0, lat - 35.0);
            var radlat = lat / 180.0 * PI;
            var magic = Math.sin(radlat);
            magic = 1 - ee * magic * magic;
            var sqrtmagic = Math.sqrt(magic);
            dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
            dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
            var mglat = lat + dlat;
            var mglng = lng + dlng;
            return [lng * 2 - mglng, lat * 2 - mglat]
        }
    },
    /**
     * 初始化地图
     */
    initMap() {
      this.map = new qq.maps.Map(document.getElementById('qmap'), {
        center: new qq.maps.LatLng(
          this.location.latitude,
          this.location.longitude
        ),
        zoomControl: false,
        panControl: false,
        zoomControl: false,
        scaleControl: false,
        mapTypeControl: false,
        scrollwheel: true,
        draggable: true,
        zoom: 16 // 地图的中心地理坐标。
      });

      qq.maps.event.addListener(this.map, 'click', this.clickMap);
      qq.maps.event.addListener(
        this.map,
        'center_changed',
        this.mapCenterChanged
      );
    },
    /**
     * 地图点击事件
     */
    clickMap(e) {
      if (this.mode === 'wide' && this.searching) {
        return false;
      }
      if (!this.settings.auto_search) this.notify('位置已重置,请重新筛选');
      this.location.longitude = e.latLng.lng;
      this.location.latitude = e.latLng.lat;
      var icon = new qq.maps.MarkerImage(
        'src/assets/images/notify-arrow.png',
        null,
        null,
        null,
        new qq.maps.Size(40, 40)
      );
      if (this.clickMarker) {
        this.clickMarker.setPosition(
          new qq.maps.LatLng(e.latLng.lat, e.latLng.lng)
        );
      } else {
        this.clickMarker = new qq.maps.Marker({
          position: new qq.maps.LatLng(e.latLng.lat, e.latLng.lng),
          map: this.map
        });
        this.clickMarker.setIcon(icon);
      }

      if (this.settings.auto_search) {
        this.getYaolingInfo();
      }
    },
    /**
     * 根据妖灵信息在地图上打个标记
     */
    addMarkers(yl) {
      let headImage = this.getHeadImagePath(yl);

      var time = new Date((yl.gentime + yl.lifetime) * 1000) - new Date();
      var second = time / 1000;
      var minute = Math.floor(second / 60);
      var second = Math.floor(second % 60);

      var fintime = minute + '分' + second + '秒';

      // new icon
      let icon = new qq.maps.MarkerImage(
        headImage,
        null,
        null,
        null,
        new qq.maps.Size(40, 40)
      );
      let position = new qq.maps.LatLng(yl.latitude / 1e6, yl.longtitude / 1e6);
      let marker = new qq.maps.Marker({
        position: position,
        map: this.map
      });

      marker.setIcon(icon);
      this.markers.push(marker);

      // 展示倒计时
      if (this.settings.show_time) {
        let labelMarker = new qq.maps.Label({
          position: position,
          offset: new qq.maps.Size(-20, 5),
          map: this.map,
          content: fintime,
          style: {
            border: 'none',
            backgroundColor: 'rgba(255,255,255,.7)'
          }
        });
        this.markers.push(labelMarker);
      }
    },
    /**
     * 清除标记
     */
    clearAllMarkers() {
      for (var i = 0; i < this.markers.length; i++) {
        this.markers[i].setMap(null);
      }
      this.markers = [];
    },
    /**
     * 地图中心改变
     */
    mapCenterChanged(position) {
      var c = this.map.getCenter();
      setLocalStorage('radar_location', {
        longitude: c.lng,
        latitude: c.lat
      });
    }
  }
};
