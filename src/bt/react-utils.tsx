import {useRef,useEffect,useState} from 'react'


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


export function createDirty() {
  const listeners = new Set();
  let value = 1;

  function subscribe(listener:any) {
    listeners.add(listener);
    return () => { listeners.delete(listener); }
  }

  function get() {
    return value;
  }

  function mark() {
    value++;
    listeners.forEach((l:any) => l(value));
  }

  return {subscribe,get,mark};
}

type DirtyBit = ReturnType<typeof createDirty>
type WithDirtyBit = {dirty:DirtyBit}

export function useDirty(b:DirtyBit|WithDirtyBit) {
  const bit:DirtyBit = (b as any).dirty || (b as any);
  const [beacon,setBeacon] = useState<number>(0);
  useEffect(() => {
    setBeacon(bit.get());
    return bit && bit.subscribe(setBeacon);
  }, [bit,setBeacon])
  return beacon;
}


