import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown,{defaultUrlTransform} from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function renderMarkdown(source){
  // GFM autolinks otherwise absorb the adjacent Chinese citation/date suffix.
  // The source bytes and visible citation stay intact; only the link target is corrected.
  return renderToStaticMarkup(React.createElement(Markdown,{
    remarkPlugins:[remarkGfm],
    urlTransform:value=>['；查閱日期：','；查閱：'].reduce((url,suffix)=>url.split(encodeURI(suffix))[0].split(suffix)[0],defaultUrlTransform(value)),
    skipHtml:true,
    components:{a:props=>React.createElement('a',{...props,target:'_blank',rel:'noopener noreferrer'}),img:()=>React.createElement('em',null,'〔外部圖片不載入〕')},
  },source));
}
