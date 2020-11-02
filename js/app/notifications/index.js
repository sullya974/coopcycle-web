import React from 'react'
import { render } from 'react-dom'
import { I18nextProvider } from 'react-i18next'
import NotificationList from './NotificationList'
import i18n from '../i18n'
import Centrifuge from 'centrifuge'

function bootstrap($popover, options) {

  if ($popover.length === 0) {
    return
  }

  const el = document.createElement('div')
  const notificationsListRef = React.createRef()

  const initPopover = () => {

    $popover.popover({
      placement: 'bottom',
      container: 'body',
      html: true,
      content: el,
      template: `<div class="popover" role="tooltip">
        <div class="arrow"></div>
        <div class="popover-content nopadding"></div>
      </div>`,
    })

    $popover.on('shown.bs.popover', () => {
      const notifications = notificationsListRef.current
        .toArray()
        .map(notification => notification.id)
      $.ajax(options.markAsReadURL, {
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(notifications),
      })
    })
  }

  const centrifuge = new Centrifuge(`ws://${window.location.hostname}/centrifugo/connection/websocket`)
  centrifuge.setToken(options.cent)

  $.getJSON(options.notificationsURL, { format: 'json' })
  .then(result => {

    const { unread, notifications } = result

    options.elements.count.innerHTML = unread

    render(
      <I18nextProvider i18n={ i18n }>
        <NotificationList
          ref={ notificationsListRef }
          notifications={ notifications }
          url={ options.notificationsURL } />
      </I18nextProvider>,
      el,
      () => {

        initPopover()

        centrifuge.subscribe(`${options.namespace}_events#${options.username}`, message => {

          const { event } = message.data

          switch (event.name) {
            case 'notifications':
              notificationsListRef.current.unshift(event.data)
              break
            case 'notifications:count':
              options.elements.count.innerHTML = event.data
              break
          }

        })
        centrifuge.connect()

      }
    )
  })
  .catch(() => { /* Fail silently */ })
}

const $notifications = $('#notifications')

if ($notifications.length > 0) {
  $.getJSON(window.Routing.generate('profile_jwt'))
    .then(result => {
      const options = {
        notificationsURL: window.Routing.generate('profile_notifications'),
        markAsReadURL: window.Routing.generate('profile_notifications_mark_as_read'),
        cent: result.cent,
        namespace: result.namespace,
        username: result.username,
        elements: {
          count: document.querySelector('#notifications .badge')
        },
      }
      bootstrap($notifications, options)
    })
}
