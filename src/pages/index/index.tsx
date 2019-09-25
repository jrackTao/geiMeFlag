import { ComponentClass } from 'react'
import Taro, { Component, Config } from '@tarojs/taro'
import { View, Button, Text, Image, Button, Canvas } from '@tarojs/components'
import { AtToast } from "taro-ui";
import bgImg from '../../images/bg.png'
import guoqiImg from '../../images/guoqi.png'

import './index.scss'

const LENGTH = 180

type PageStateProps = {

}

type PageDispatchProps = {
}

type PageOwnProps = {}

type PageState = {}

type IProps = PageStateProps & PageDispatchProps & PageOwnProps

interface Index {
  props: IProps;
}


const getImageInfo = (imgUrl) => new Promise((resolve, reject) => {
  wx.getImageInfo({
    src: imgUrl,
    success(res) {
      resolve(res.path)
    },
    fail(err) {
      reject(err)
    }
  })
})

// 将生成的canvas图片，转为真实图片
const getSetting = () => new Promise((resolve, reject) => {
  wx.getSetting({
    success(res) {
      resolve(res)
    }
  })
})


const saveImage = (img) => new Promise((resolve, reject) => {
  wx.saveImageToPhotosAlbum({
    filePath: img,
    success() {
      resolve();
    },
    fail() {
      reject();
    }
  })
})


const auth = () => new Promise((resolve, reject) => {
  wx.authorize({
    scope: 'scope.writePhotosAlbum',
    success() {
      resolve()
    }
  })
})

const canvasToPath = (canvas) => new Promise((resolve, reject) => {
  wx.canvasToTempFilePath({
    x: 0,
    y: 0,
    canvasId: canvas,
    success: function (res) {
      let shareImg = res.tempFilePath;
      resolve(shareImg)
    },
    fail: function (res) {
      reject(res)
    }
  })
})

const chooseImage = () => new Promise((resolve, reject) => {
  wx.chooseImage({
    count: 1,
    sizeType: ['original', 'compressed'],
    sourceType: ['album'],
    success(res) {
      // tempFilePath可以作为img标签的src属性显示图片
      const tempFilePaths = res.tempFilePaths
      resolve(tempFilePaths)
    }
  })
})



class Index extends Component {

  /**
 * 指定config的类型声明为: Taro.Config
 *
 * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
 * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
 * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
 */
  config: Config = {
    navigationBarTitleText: '给我个国旗'
  }

  state = {
    step: 'getInfo',
    isOpened: false,
    status: 'loading',
    saving: false,
    newImage: '',
    toastText: '获取头像中',
  }

  interstitialAd = null

  componentDidMount() {
    this.ctx = wx.createCanvasContext('canvas')
    // 在页面onLoad回调事件中创建插屏广告实例
    if (wx.createInterstitialAd) {
      this.interstitialAd = wx.createInterstitialAd({
        adUnitId: 'adunit-b7eb8f1969b7ce4c'
      })
      this.interstitialAd.onLoad(() => { })
      this.interstitialAd.onError((err) => { })
      this.interstitialAd.onClose(() => { })
    }
  }

  onGetUserInfo = async (e) => {
    const imgUrl = await chooseImage();
    const avater = await getImageInfo(imgUrl[0]);
    this.ctx.drawImage(avater, 0, 0, LENGTH, LENGTH);
    const GQ = { width: 136, height: 116 }
    const scal = 1.9;
    this.ctx.drawImage(guoqiImg, LENGTH - GQ.width / scal, LENGTH - GQ.height / scal, GQ.width / scal, GQ.height / scal)
    this.ctx.draw()
    setTimeout(async () => {
      const img = await canvasToPath('canvas');
      this.setState({
        newImage: img,
        step: 'saveImage'
      })
    }, 100);

  }

  // 长按保存事件
  onSaveImage = async () => {
    // 获取用户是否开启用户授权相册
    const { newImage } = this.state;
    const res = await getSetting();
    if (!res.authSetting['scope.writePhotosAlbum']) {
      await auth();
      this.setState({
        saving: true,
      })
      await saveImage(newImage)
    } else {
      await saveImage(newImage)
    }
    // 在适合的场景显示插屏广告
    if (this.interstitialAd) {
      this.interstitialAd.show().catch((err) => {
        console.error(err)
      })
    }
    this.setState({
      isOpened: true,
      status: 'success',
      toastText: '保存成功',
      step: 'share',
      saving: false,
    })
  }

  share = () => {
    wx.showShareMenu({
      withShareTicket: true
    })
  }

  render() {
    const { step, isOpened = false, toastText, saving, newImage, status = "loading" } = this.state;
    return (
      <View className='index'>
        <AtToast
          className="toast"
          isOpened={isOpened} text={toastText} status={status}></AtToast>
        <Image
          className="bg"
          mode="aspectFill"
          src={bgImg}
        />
        <View className="avater">
          {newImage
            ? <Image
              className="new-img"
              mode="aspectFill"
              src={newImage}
            />
            : <Canvas style='width: 180px; height: 180px;z-index:-1;position:absolute' canvasId='canvas' />}
        </View>
        {
          step === 'getInfo' && <Button className="btn" onClick={this.onGetUserInfo}>从相册中选择头像</Button>
        }
        {
          step === 'saveImage' && <Button disabled={saving} className="btn" onClick={this.onSaveImage}>保存图片</Button>
        }
        {
          step === 'share' && <Button openType="share" className="btn" onClick={this.share}>分享给好友</Button>
        }
        <ad style={{ marginTop: 2 }} unit-id="adunit-b369f4bf97f2c691"></ad>

      </View>
    )
  }
}

// #region 导出注意
//
// 经过上面的声明后需要将导出的 Taro.Component 子类修改为子类本身的 props 属性
// 这样在使用这个子类时 Ts 才不会提示缺少 JSX 类型参数错误
//
// #endregion

export default Index as ComponentClass<PageOwnProps, PageState>
