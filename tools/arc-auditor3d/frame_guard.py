"""ARC Auditor 3D: compara los pixeles de dos PNG sin editar los originales.
No certifica colisiones, naturalidad ni semejanza facial.
PNG 8 bits sin entrelazado, tipos gris/RGB/gris+alfa/RGBA.
"""
import argparse
import json
from pathlib import Path
import struct
import sys
import zlib

PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
CHANNELS = {0:1, 2:3, 4:2, 6:4}
MAX_PIXELS = 12_000_000
MAX_BYTES = 55_000_000

class PNGError(ValueError):
    pass

def decode_png(source):
    source = Path(source).resolve(strict=True)
    if source.suffix.lower() != '.png':
        raise PNGError('Se requiere archivo PNG')
    if source.stat().st_size > MAX_BYTES:
        raise PNGError('PNG excede el limite de tamano')
    raw = source.read_bytes()
    if raw[:8] != PNG_SIGNATURE:
        raise PNGError('Firma PNG incorrecta')
    pos = 8
    ihdr = None
    idat = []
    ended = False
    while pos + 12 <= len(raw):
        length = struct.unpack_from('>I', raw, pos)[0]
        if length > MAX_BYTES:
            raise PNGError('Chunk PNG demasiado grande')
        tag = raw[pos+4:pos+8]
        start = pos + 8
        end = start + length
        if end + 4 > len(raw):
            raise PNGError('Chunk PNG truncado')
        data = raw[start:end]
        crc = struct.unpack_from('>I', raw, end)[0]
        if (zlib.crc32(tag + data) & 0xffffffff) != crc:
            raise PNGError('CRC PNG incorrecto')
        pos = end + 4
        if tag == b'IHDR':
            if ihdr is not None or length != 13:
                raise PNGError('IHDR duplicado o invalido')
            ihdr = struct.unpack('>IIBBBBB', data)
        elif tag == b'IDAT':
            idat.append(data)
        elif tag == b'IEND':
            ended = True
            break
        elif not (tag[0] & 32) and tag not in {b'PLTE'}:
            raise PNGError('Chunk critico PNG no soportado')
    if ihdr is None or not idat or not ended:
        raise PNGError('PNG incompleto')
    w,h,bit_depth,color_type,compression,flt,interlace = ihdr
    if w < 1 or h < 1 or w*h > MAX_PIXELS:
        raise PNGError('Dimensiones fuera del limite')
    if bit_depth != 8 or color_type not in CHANNELS or (compression,flt,interlace) != (0,0,0):
        raise PNGError('PNG no soportado: usar RGB/RGBA de 8 bits sin entrelazado')
    bpp = CHANNELS[color_type]
    stride = w*bpp
    expected = (stride+1)*h
    if expected > MAX_BYTES:
        raise PNGError('Imagen descomprimida demasiado grande')
    decomp = zlib.decompressobj()
    pixels = decomp.decompress(b''.join(idat), expected+1)
    if len(pixels)>expected or decomp.unconsumed_tail:
        raise PNGError('Descompresion excede tamano esperado')
    pixels += decomp.flush()
    if len(pixels) != expected or not decomp.eof:
        raise PNGError('Descompresion PNG incompleta')
    output = bytearray(stride*h)
    last = bytearray(stride)
    cursor = 0
    for rownum in range(h):
        ft=pixels[cursor]
        cursor+=1
        row=bytearray(pixels[cursor:cursor+stride]); cursor+=stride
        if ft>4:
            raise PNGError('Filtro PNG invalido')
        for i in range(stride):
            a=row[i-bpp] if i>=bpp else 0
            b=last[i]
            c=last[i-bpp] if i>=bpp else 0
            if ft==1: delta=a
            elif ft==2: delta=b
            elif ft==3: delta=(a+b)//2
            elif ft==4:
                p=a+b-c
                pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                delta=a if pa<=pb and pa<=pc else (b if pb<=pc else c)
            else: delta=0
            row[i]=(row[i]+delta)&255
        output[rownum*stride:(rownum+1)*stride]=row
        last=row
    return w,h,color_type,bytes(output)

def compare(first,second):
    a=decode_png(first)
    b=decode_png(second)
    if a[:3]!=b[:3]:
        return {'status':'BLOQUEADO_FORMATO_INCOMPATIBLE','width_a':a[0],
                'height_a':a[1],'width_b':b[0],'height_b':b[1],
                'color_type_a':a[2],'color_type_b':b[2],
                'animation_approved':False}
    changes=sum(x!=y for x,y in zip(a[3],b[3]))
    fraction=changes/len(a[3])
    if changes==0: status='BLOQUEADO_IMAGENES_IDENTICAS'
    elif fraction<.001: status='CAMBIO_MUY_PEQUENO_REVISION'
    else: status='CAMBIO_DETECTADO_REVISION_HUMANA'
    return {'status':status,'width':a[0],'height':a[1],
            'different_channels':changes,
            'fraction_different_channels':round(fraction,8),
            'animation_approved':False}

def main():
    parser=argparse.ArgumentParser(description='Compara pixeles PNG; no certifica animacion')
    parser.add_argument('open_png')
    parser.add_argument('closed_png')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    try:
        result=compare(args.open_png,args.closed_png)
    except (OSError,ValueError,zlib.error) as e:
        result={'status':'BLOQUEADO_LECTURA','error':str(e),'animation_approved':False}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['status']=='CAMBIO_DETECTADO_REVISION_HUMANA' else 2

if __name__=='__main__':
    sys.exit(main())
