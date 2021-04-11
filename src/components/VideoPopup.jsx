/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import { Radio, Input, Modal, Button, notification } from 'antd';
import IPFSService from '../services/IPFSService';
import config from '../configuration';

const VideoPopup = ({ visible, handleClose, reactQuillRef }) => {
  const [type, setType] = useState(1);
  const [url, setURL] = useState('');
  const [youtubeUrl, setYoutubeURL] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [loading, setLoading] = useState(false);
  const stream = useRef(null);
  const file = useRef(null);

  const onChange = e => {
    setType(e.target.value);
  };

  const handleCamera = () => {
    navigator.getUserMedia(
      { audio: true, video: true },
      cameraStream => {
        stream.current = new window.MultiStreamsMixer([cameraStream]);
        stream.current.frameInterval = 1;
        stream.current.startDrawingFrames();
        window.setSrcObject(stream.current.getMixedStream(), document.getElementById('video'));
        // this.setState(
        //   {
        //     stream: new window.MultiStreamsMixer([cameraStream]),
        //     cameraStream,
        //   },
        //   () => {
        //     this.state.stream.frameInterval = 1; // eslint-disable-line react/no-direct-mutation-state
        //     this.state.stream.startDrawingFrames();
        //     window.setSrcObject(
        //       this.state.stream.getMixedStream(),
        //       document.getElementById('video'),
        //     );
        //   },
        // );
      },
      () => {
        // alert('No camera devices found');
      },
    );
  };

  const detectExtension = () => {
    const extensionid = 'ajhifddimkapgcifgcodmmfdlknahffk';
    const image = document.createElement('img');
    image.src = `chrome-extension://${extensionid}/icon.png`;

    image.onload = () => {
      // handleScreenSharing();
    };
    image.onerror = () => {
      setCurrentState('missing extension');
    };
  };

  useEffect(() => {
    if (type === 4) {
      handleCamera();
    } else if (type === 5) {
      detectExtension();
    }
  }, [type]);
  function clearStates() {
    if (file.current) {
      file.current.value = null;
    }
    setLoading(false);
    setURL(false);
  }

  function closeModal() {
    clearStates();
    handleClose();
  }

  function insertToEditor(videURL) {
    const quill = reactQuillRef.current.getEditor();
    const index = quill.getLength() - 1;
    quill.insertEmbed(index, 'video', videURL);
  }

  function getVideoUrl(tempUrl) {
    let match =
      tempUrl.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtube\.com\/watch.*v=([a-zA-Z0-9_-]+)/) ||
      tempUrl.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtu\.be\/([a-zA-Z0-9_-]+)/) ||
      tempUrl.match(/^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?showinfo=0`;
    }
    match = tempUrl.match(/^(?:(https?):\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
    if (match) {
      return `${match[1] || 'https'}://player.vimeo.com/video/${match[2]}/`;
    }
    return null;
  }

  function uploadVideoToIPFS() {
    const reader = new FileReader();
    reader.onload = _ => {
      IPFSService.upload(file.current.files[0])
        .then(hash => {
          insertToEditor(config.ipfsGateway + hash.slice(6));
          closeModal();
        })
        .catch(() => {
          notification.error({
            message: 'IPFS Fails',
            description: 'Something went wrong with the upload.',
          });
        })
        .finally(() => {
          setLoading(false);
        });
    };
    setLoading(true);
    reader.readAsDataURL(file.current.files[0]);
  }

  function onOk() {
    let tempURL;
    switch (type) {
      case 1:
        insertToEditor(url);
        closeModal();
        break;
      case 2:
        uploadVideoToIPFS();
        break;
      case 3:
        tempURL = getVideoUrl(youtubeUrl);
        if (tempURL) {
          insertToEditor(tempURL);
          closeModal();
        }
        break;
      default:
        break;
    }
  }

  return (
    <Modal
      title="Attach a video to description"
      visible={visible}
      onOk={onOk}
      onCancel={closeModal}
      footer={[
        <Button key="back" onClick={closeModal}>
          cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={onOk}>
          Submit
        </Button>,
      ]}
    >
      <Radio.Group onChange={onChange} value={type}>
        <Radio value={1}>Link</Radio>
        <Radio value={2}>File</Radio>
        <Radio value={3}>Youtube</Radio>
        {/* <Radio value={3}>Camera</Radio> */}
        {/* <Radio value={4}>Screen sharing</Radio> */}
      </Radio.Group>
      <div style={{ paddingTop: '40px' }}>
        {type === 1 && <Input placeholder="Video URL" onChange={e => setURL(e.target.value)} />}
        {type === 2 && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <input type="file" accept="video/*" ref={file} />
          </div>
        )}
        {type === 3 && (
          <Input placeholder="Video URL" onChange={e => setYoutubeURL(e.target.value)} />
        )}
        {currentState === 'missing extension' && (
          <div role="alert">
            <strong>You need to install this </strong>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk"
            >
              Chrome extension
            </a>{' '}
            <strong>and reload</strong>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VideoPopup;
