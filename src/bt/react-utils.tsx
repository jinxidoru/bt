import {useRef,useEffect} from 'react'
import React from 'react'


export function useAnimate(fn:any) {
  const animateRef = useRef<number>(-1);

  const animate = (time:any) => {
    animateRef.current = requestAnimationFrame(animate);
    fn(time);
  }

  useEffect(() => {
    animateRef.current = window.requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animateRef.current);
  });
}


export function useWindowEvent(name:string, fn:any) {
  useEffect(() => {
    window.addEventListener(name, fn);
    return () => { window.removeEventListener(name, fn); };
  });
}


export function createContext<T>() {
  return React.createContext(null) as any as React.Context<T>;
}

export type ContextProp<T> = [T,(k:T) => void]


