import { Prose } from '../../../../components/lesson'
import { FileStoreDiagram } from '../../FileStoreDiagram'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>This lesson is coming soon.</p>
      </Prose>
      <FileStoreDiagram step={1} />
    </>
  )
}
