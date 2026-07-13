export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/lineups/index',
    'pages/detail/index',
    'pages/profile/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#08111f',
    navigationBarTitleText: 'VOR Lineup',
    navigationBarTextStyle: 'white',
    backgroundColor: '#08111f'
  },
  tabBar: {
    color: '#8ea0b8',
    selectedColor: '#ff4655',
    backgroundColor: '#0b1424',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/lineups/index',
        text: '点位'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的'
      }
    ]
  }
})
